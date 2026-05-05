.PHONY: init plan apply destroy build-lambdas deploy-lambdas logs-signup logs-login logs-dashboard get-outputs frontend-dev frontend-install apply-schema

# ─── Terraform ────────────────────────────────────────────────────────────────
init:
	cd terraform && terraform init

plan:
	cd terraform && terraform plan -out=tfplan

apply:
	cd terraform && terraform apply tfplan

destroy:
	cd terraform && terraform destroy

get-outputs:
	cd terraform && terraform output -json

# ─── Lambda build & deploy ────────────────────────────────────────────────────
build-lambdas:
	@echo "Installing backend dependencies…"
	cd backend && npm install
	@echo "Zipping Lambda functions…"
	@for dir in backend/functions/*/; do \
		name=$$(basename $$dir); \
		echo "  Zipping $$name…"; \
		cd $$dir && zip -qr ../../.lambda_build/$$name.zip . && cd ../..; \
	done
	@echo "Done."

deploy-lambdas: build-lambdas
	@echo "Deploying Lambda functions…"
	@for dir in backend/functions/*/; do \
		name=$$(basename $$dir); \
		fn_name="career-tracker-dev-$$name"; \
		echo "  Deploying $$fn_name…"; \
		aws lambda update-function-code \
			--function-name $$fn_name \
			--zip-file fileb://backend/.lambda_build/$$name.zip \
			--region eu-west-1 \
			--no-cli-pager > /dev/null; \
	done
	@echo "Done."

# ─── Database ─────────────────────────────────────────────────────────────────
apply-schema:
	@DB_HOST=$$(cd terraform && terraform output -raw db_host); \
	DB_NAME=$$(cd terraform && terraform output -raw rds_db_name); \
	echo "Applying schema to $$DB_HOST/$$DB_NAME…"; \
	psql "host=$$DB_HOST dbname=$$DB_NAME user=postgres sslmode=require" -f backend/schema.sql

# ─── CloudWatch logs ──────────────────────────────────────────────────────────
logs-signup:
	aws logs tail /aws/lambda/career-tracker-dev-auth-signup --follow --region eu-west-1

logs-login:
	aws logs tail /aws/lambda/career-tracker-dev-auth-login --follow --region eu-west-1

logs-dashboard:
	aws logs tail /aws/lambda/career-tracker-dev-dashboard-metrics --follow --region eu-west-1

# ─── Frontend ─────────────────────────────────────────────────────────────────
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build
