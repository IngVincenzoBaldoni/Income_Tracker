#!/usr/bin/env bash
# ============================================================
#  Career Income Tracker — Full Deploy Script
#  Runs: prerequisites → build → terraform → schema → frontend
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓${RESET} $*"; }
fail() { echo -e "${RED}  ✗${RESET} $*"; }
info() { echo -e "${CYAN}  →${RESET} $*"; }
warn() { echo -e "${YELLOW}  ⚠${RESET} $*"; }
step() { echo -e "\n${BOLD}${CYAN}══ $* ${RESET}"; }
hr()   { echo -e "${CYAN}────────────────────────────────────────────────────${RESET}"; }

# ── Header ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║     Career Income Tracker — AWS Deploy       ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  Root: $ROOT_DIR"
echo "  Date: $(date '+%Y-%m-%d %H:%M:%S')"
hr

# ── Step 1: Prerequisites ─────────────────────────────────────────────────────
step "Step 1/8 — Prerequisites check"

ERRORS=0

check_cmd() {
  local cmd=$1 label=$2 hint=$3
  if command -v "$cmd" &>/dev/null; then
    ok "$label: $($cmd --version 2>&1 | head -1)"
  else
    fail "$label not found. $hint"
    ERRORS=$((ERRORS + 1))
  fi
}

check_cmd aws       "AWS CLI"   "Install: https://aws.amazon.com/cli/"
check_cmd terraform "Terraform" "Install: https://developer.hashicorp.com/terraform/install"
check_cmd node      "Node.js"   "Install: https://nodejs.org (>= 18)"
check_cmd npm       "npm"       "Comes with Node.js"
check_cmd zip       "zip"       "brew install zip / apt install zip"

# psql is optional — schema is applied via Lambda
if command -v psql &>/dev/null; then
  ok "psql: $(psql --version 2>&1 | head -1)"
else
  warn "psql not found — schema will be applied via Lambda (no action needed)."
fi

# AWS credentials
echo ""
info "Verifying AWS credentials..."
if aws sts get-caller-identity --output text --query 'Account' &>/dev/null; then
  ACCOUNT=$(aws sts get-caller-identity --output text --query 'Account')
  ok "AWS account: $ACCOUNT"
else
  fail "AWS credentials not configured. Run: aws configure"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  fail "${ERRORS} prerequisite(s) missing. Fix them and re-run."
  exit 1
fi

ok "All required prerequisites satisfied."

# Set region for AWS CLI calls (Terraform reads it from tfvars)
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-eu-west-1}"
info "AWS region: $AWS_DEFAULT_REGION"

# ── Step 2: terraform.tfvars ──────────────────────────────────────────────────
step "Step 2/8 — Terraform variables"

TFVARS="$ROOT_DIR/terraform/terraform.tfvars"

if [ ! -f "$TFVARS" ]; then
  warn "terraform.tfvars not found. Creating from example..."
  cp "$ROOT_DIR/terraform/terraform.tfvars.example" "$TFVARS"
  echo ""
  echo -e "${YELLOW}  ┌────────────────────────────────────────────────────┐"
  echo -e "  │  ACTION REQUIRED                                   │"
  echo -e "  │  Edit terraform/terraform.tfvars and set           │"
  echo -e "  │  a strong db_password, then re-run deploy.sh       │"
  echo -e "  └────────────────────────────────────────────────────┘${RESET}"
  echo ""
  echo "  File: $TFVARS"
  exit 1
fi

if grep -q "CHANGE_ME" "$TFVARS"; then
  fail "terraform.tfvars still has the placeholder db_password."
  info "Edit $TFVARS and set a real password, then re-run."
  exit 1
fi

ok "terraform.tfvars found and configured."

# ── Step 3: Terraform init ────────────────────────────────────────────────────
step "Step 3/8 — Terraform init + placeholder zips"

cd "$ROOT_DIR"

LAMBDA_NAMES=(
  auth-signup auth-login auth-confirm auth-change-password
  user-get jobs-create jobs-list jobs-update jobs-delete
  dashboard-metrics db-migrate
)

mkdir -p backend/.lambda_build
for name in "${LAMBDA_NAMES[@]}"; do
  if [ ! -f "backend/.lambda_build/$name.zip" ]; then
    printf 'exports.handler = async () => ({ statusCode: 503 });' > /tmp/_ct_ph.js
    zip -jq "backend/.lambda_build/$name.zip" /tmp/_ct_ph.js
    info "placeholder: $name.zip"
  fi
done

cd "$ROOT_DIR/terraform"
terraform init -input=false
ok "Terraform initialized."

# ── Step 4: Build Lambda functions ────────────────────────────────────────────
step "Step 4/8 — Build Lambda functions"

cd "$ROOT_DIR"
chmod +x backend/scripts/build-lambdas.sh
bash backend/scripts/build-lambdas.sh

# ── Step 5: Terraform plan ────────────────────────────────────────────────────
step "Step 5/8 — Terraform plan"

cd "$ROOT_DIR/terraform"
terraform plan -input=false -out=tfplan

echo ""
echo -e "${YELLOW}${BOLD}  Review the plan above.${RESET}"
echo -e "${YELLOW}  This will create AWS resources (RDS, Lambda, Cognito, API Gateway).${RESET}"
echo -e "${YELLOW}  Estimated cost: ~\$0/month within AWS free tier.${RESET}"
echo ""

# Interactive confirmation (auto-proceed if not a TTY, e.g. CI)
if [ -t 0 ]; then
  read -r -p "  Proceed with terraform apply? [y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    warn "Aborted. Run 'make apply' when ready."
    exit 0
  fi
else
  warn "Non-interactive mode — proceeding automatically."
fi

# ── Step 6: Terraform apply ───────────────────────────────────────────────────
step "Step 6/8 — Terraform apply  (this takes ~10-15 min)"

terraform apply -input=false tfplan

echo ""
ok "Infrastructure deployed!"
hr

# Capture outputs
API_URL=$(terraform output -raw api_url        2>/dev/null)
POOL_ID=$(terraform output -raw cognito_pool_id 2>/dev/null)
CLIENT_ID=$(terraform output -raw cognito_app_client_id 2>/dev/null)
DB_NAME=$(terraform output -raw rds_db_name    2>/dev/null)
REGION=$(grep 'region' "$TFVARS" | awk -F'"' '{print $2}' | head -1)

echo ""
echo -e "  ${BOLD}Outputs:${RESET}"
echo "  API URL:         $API_URL"
echo "  Cognito Pool:    $POOL_ID"
echo "  Cognito Client:  $CLIENT_ID"
echo "  DB name:         $DB_NAME"
echo "  Region:          $REGION"

# ── Step 7: Apply database schema via Lambda ──────────────────────────────────
step "Step 7/8 — Apply database schema (via Lambda)"

cd "$ROOT_DIR"
MIGRATE_FN="career-tracker-dev-db-migrate"

info "Invoking Lambda migration function: $MIGRATE_FN..."

RESULT=$(aws lambda invoke \
  --function-name "$MIGRATE_FN" \
  --region "$AWS_DEFAULT_REGION" \
  --log-type Tail \
  --cli-read-timeout 60 \
  --output json \
  /tmp/migrate_output.json 2>&1)

HTTP_STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('StatusCode','?'))" 2>/dev/null || echo "?")
RESPONSE=$(cat /tmp/migrate_output.json 2>/dev/null || echo "{}")

if echo "$RESPONSE" | grep -q '"success":true'; then
  ok "Schema applied successfully."
else
  warn "Migration response: $RESPONSE"
  warn "If this is the first deploy, check Lambda logs: make logs-migrate"
fi

# ── Write frontend/.env.local (always overwrite with latest terraform outputs) ─
hr
ENV_FILE="$ROOT_DIR/frontend/.env.local"

info "Writing frontend/.env.local..."
cat > "$ENV_FILE" <<EOF
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$POOL_ID
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID
NEXT_PUBLIC_COGNITO_REGION=${REGION:-eu-west-1}
EOF
ok "frontend/.env.local written."

# ── Step 8: Build and deploy frontend to S3 + CloudFront ─────────────────────
step "Step 8/8 — Build frontend + deploy to S3 + CloudFront"

cd "$ROOT_DIR/terraform"
S3_BUCKET=$(terraform output -raw frontend_s3_bucket     2>/dev/null || echo "")
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
CF_URL=$(terraform output -raw cloudfront_url             2>/dev/null || echo "")

if [ -z "$S3_BUCKET" ] || [ -z "$CF_DIST_ID" ]; then
  fail "Could not read S3 bucket / CloudFront outputs from Terraform."
  exit 1
fi

info "S3 bucket:     $S3_BUCKET"
info "CloudFront ID: $CF_DIST_ID"

# Build Next.js static export
cd "$ROOT_DIR/frontend"
info "Installing frontend dependencies..."
npm install --prefer-offline --no-audit --no-fund

info "Building Next.js static export (next build)..."
npm run build

# Sync out/ to S3
info "Syncing static assets to s3://$S3_BUCKET ..."
aws s3 sync out/ "s3://$S3_BUCKET" \
  --delete \
  --region "$AWS_DEFAULT_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.json"

# HTML + JSON files: short cache so re-deploys take effect quickly
aws s3 sync out/ "s3://$S3_BUCKET" \
  --delete \
  --region "$AWS_DEFAULT_REGION" \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --include "*.json"

ok "Files synced to S3."

# Invalidate CloudFront cache
info "Invalidating CloudFront cache (distribution: $CF_DIST_ID)..."
aws cloudfront create-invalidation \
  --distribution-id "$CF_DIST_ID" \
  --paths "/*" \
  --output text \
  --query 'Invalidation.Id' | xargs -I{} echo "  Invalidation ID: {}"

ok "CloudFront cache invalidated."

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  ✅ Deploy complete! Everything is live on AWS.${RESET}"
echo ""
echo -e "  ${BOLD}Frontend URL:${RESET}  $CF_URL"
echo -e "  ${BOLD}API URL:${RESET}       $API_URL"
echo ""
echo -e "  ${BOLD}Monitor Lambda logs:${RESET}"
echo "       make logs-signup      make logs-dashboard"
echo ""
hr
echo ""
