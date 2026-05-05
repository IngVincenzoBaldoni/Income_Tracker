.PHONY: init plan apply destroy build-lambdas deploy-lambdas \
        apply-schema get-outputs \
        logs-signup logs-login logs-dashboard \
        frontend-install frontend-dev frontend-build

LAMBDA_NAMES := auth-signup auth-login auth-confirm auth-change-password \
                user-get jobs-create jobs-list jobs-update jobs-delete \
                dashboard-metrics db-migrate

# ─── Terraform ────────────────────────────────────────────────────────────────

# Creates placeholder zips so `terraform plan` can reference the files
# even before the real build has run. Safe to call multiple times.
placeholders:
	@mkdir -p backend/.lambda_build
	@for name in $(LAMBDA_NAMES); do \
		if [ ! -f backend/.lambda_build/$$name.zip ]; then \
			printf 'exports.handler = async () => ({ statusCode: 503, body: JSON.stringify({ error: "placeholder" }) });' \
				> /tmp/_ct_placeholder.js; \
			zip -jq backend/.lambda_build/$$name.zip /tmp/_ct_placeholder.js; \
			echo "  placeholder: $$name.zip"; \
		fi; \
	done

# Run once at project setup
init: placeholders
	cd terraform && terraform init

# Builds real Lambda zips first, then plans — this is the normal workflow
plan: build-lambdas
	cd terraform && terraform plan -out=tfplan

apply:
	cd terraform && terraform apply tfplan

destroy:
	cd terraform && terraform destroy

get-outputs:
	cd terraform && terraform output -json

# ─── Lambda build ─────────────────────────────────────────────────────────────

# Produces backend/.lambda_build/<name>.zip with bundled node_modules.
# node_modules is required because Node 18.x Lambda does NOT include aws-sdk v2.
build-lambdas:
	@chmod +x backend/scripts/build-lambdas.sh
	@bash backend/scripts/build-lambdas.sh

# Hot-deploy after infrastructure already exists (skips terraform)
deploy-lambdas: build-lambdas
	@echo "Deploying Lambda functions to AWS..."
	@for name in $(LAMBDA_NAMES); do \
		fn="career-tracker-dev-$$name"; \
		echo "  → $$fn"; \
		aws lambda update-function-code \
			--function-name $$fn \
			--zip-file fileb://backend/.lambda_build/$$name.zip \
			--region eu-west-1 \
			--no-cli-pager > /dev/null; \
	done
	@echo "Done."

# ─── Database ─────────────────────────────────────────────────────────────────

apply-schema:
	@DB_HOST=$$(cd terraform && terraform output -raw rds_host 2>/dev/null); \
	DB_NAME=$$(cd terraform && terraform output -raw rds_db_name 2>/dev/null); \
	echo "Applying schema to $$DB_HOST/$$DB_NAME..."; \
	psql "host=$$DB_HOST dbname=$$DB_NAME user=postgres sslmode=require" \
		-f backend/schema.sql

# ─── CloudWatch logs ──────────────────────────────────────────────────────────

logs-signup:
	aws logs tail /aws/lambda/career-tracker-dev-auth-signup --follow --region eu-west-1

logs-login:
	aws logs tail /aws/lambda/career-tracker-dev-auth-login --follow --region eu-west-1

logs-dashboard:
	aws logs tail /aws/lambda/career-tracker-dev-dashboard-metrics --follow --region eu-west-1

logs-migrate:
	aws logs tail /aws/lambda/career-tracker-dev-db-migrate --follow --region eu-west-1

migrate:
	aws lambda invoke \
		--function-name career-tracker-dev-db-migrate \
		--region eu-west-1 \
		--log-type Tail \
		--cli-read-timeout 60 \
		/tmp/migrate_output.json && cat /tmp/migrate_output.json

# ─── Frontend ─────────────────────────────────────────────────────────────────

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
