# Career Income Tracker

A SaaS platform for tech professionals to track salary progression and visualize career growth.

**Stack:** Next.js 14 · Node.js Lambda · PostgreSQL (RDS) · AWS Cognito · Terraform · Vercel

---

## Project structure

```
├── terraform/          AWS infrastructure (RDS, Lambda, API Gateway, Cognito, IAM)
├── backend/
│   ├── schema.sql      Database schema
│   ├── package.json
│   └── functions/      10 Lambda functions
│       ├── auth-signup / auth-login / auth-confirm / auth-change-password
│       ├── user-get
│       ├── jobs-create / jobs-list / jobs-update / jobs-delete
│       └── dashboard-metrics
└── frontend/           Next.js 14 app (deployed to Vercel)
    ├── pages/          Landing, auth, onboarding, dashboard, profile
    ├── components/     Auth, Dashboard, Jobs, Navigation, Common
    ├── hooks/          useAuth, useJobs, useDashboard
    └── utils/          api.ts, auth.ts, calculations.ts
```

---

## Getting started

### Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform >= 1.0
- Node.js >= 18
- PostgreSQL client (`psql`) for schema migration

### 1 — Provision infrastructure

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform.tfvars — set a strong db_password

make init
make plan
make apply
make get-outputs   # copy values for next steps
```

### 2 — Apply database schema

```bash
make apply-schema
# Or manually:
# psql "host=<DB_HOST> dbname=career_tracker user=postgres sslmode=require" -f backend/schema.sql
```

### 3 — Deploy Lambda functions

```bash
cd backend && npm install
make deploy-lambdas
```

### 4 — Configure & run the frontend

```bash
cp frontend/.env.local.example frontend/.env.local
# Fill NEXT_PUBLIC_API_URL, NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID
# from `make get-outputs`

make frontend-install
make frontend-dev       # http://localhost:3000
```

### 5 — Deploy frontend to Vercel

```bash
cd frontend
npx vercel --prod
# Set env vars in Vercel dashboard (same as .env.local)
```

---

## Development commands

| Command | Description |
|---|---|
| `make init` | `terraform init` |
| `make plan` | `terraform plan` |
| `make apply` | `terraform apply` |
| `make destroy` | Tear down all AWS resources |
| `make get-outputs` | Print Terraform outputs as JSON |
| `make deploy-lambdas` | Zip + update all Lambda functions |
| `make apply-schema` | Run schema.sql against RDS |
| `make frontend-dev` | Start Next.js dev server |
| `make logs-signup` | Tail auth-signup CloudWatch logs |
| `make logs-dashboard` | Tail dashboard-metrics CloudWatch logs |

---

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | — | Create account |
| POST | `/auth/login` | — | Login, returns tokens |
| POST | `/auth/confirm` | — | Confirm email code |
| PUT | `/auth/password` | ✓ | Change password |
| GET | `/user` | ✓ | Get user profile |
| POST | `/jobs` | ✓ | Add salary entry |
| GET | `/jobs` | ✓ | List all salary entries |
| PUT | `/jobs/:jobId` | ✓ | Update entry |
| DELETE | `/jobs/:jobId` | ✓ | Delete entry |
| GET | `/dashboard/metrics` | ✓ | Charts + stats data |

---

## MVP scope (Phase 2 not included)

- No Stripe / payments
- No market benchmarking
- No peer comparison
- No email notifications
- No PDF export
- No mobile app
