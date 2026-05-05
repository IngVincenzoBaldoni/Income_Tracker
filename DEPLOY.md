# Deploy Guide — Career Income Tracker

Questa guida ti porta da zero a produzione su AWS + Vercel.

---

## Prerequisiti

Installa e verifica prima di procedere:

```bash
# AWS CLI
aws --version                  # >= 2.x
aws configure                  # access key, secret, region: eu-west-1, output: json

# Terraform
terraform -version             # >= 1.0

# Node.js
node --version                 # >= 18.x
npm --version                  # >= 9.x

# psql (per applicare lo schema)
psql --version                 # qualsiasi versione recente
# macOS:  brew install libpq && brew link --force libpq
# Ubuntu: sudo apt install postgresql-client
```

Verifica che le credenziali AWS funzionino:
```bash
aws sts get-caller-identity
# Deve restituire il tuo account ID e ARN
```

---

## Step 1 — Configura le variabili Terraform

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Apri `terraform/terraform.tfvars` e imposta una password sicura:

```hcl
region      = "eu-west-1"
app_name    = "career-tracker"
environment = "dev"
db_username = "postgres"
db_password = "TuaPasswordForte123!"   # ← cambia questa
db_name     = "career_tracker"
```

> La password non viene mai committata — `*.tfvars` è nel `.gitignore`.

---

## Step 2 — Inizializza Terraform

```bash
make init
```

Questo fa due cose:
1. Crea placeholder zip per le Lambda (così Terraform può referenziarle)
2. Esegue `terraform init` (scarica i provider AWS)

Output atteso:
```
  placeholder: auth-signup.zip
  placeholder: auth-login.zip
  ...
Terraform has been successfully initialized!
```

---

## Step 3 — Build delle Lambda functions

```bash
make build-lambdas
```

Installa le dipendenze Node.js (`pg`, `aws-sdk`) e crea uno zip per ogni funzione con `node_modules` bundlato dentro.

> **Perché è necessario**: Node.js 18.x su Lambda non include più `aws-sdk` v2 nel runtime. Deve essere bundlato nello zip.

Output atteso:
```
Installing backend dependencies...
  node_modules ready (42M)

Building Lambda zips...
  auth-signup.zip         (8.5M)
  auth-login.zip          (8.5M)
  auth-confirm.zip        (3.2M)
  auth-change-password.zip (3.2M)
  user-get.zip            (8.5M)
  jobs-create.zip         (8.5M)
  jobs-list.zip           (8.5M)
  jobs-update.zip         (8.5M)
  jobs-delete.zip         (8.5M)
  dashboard-metrics.zip   (8.5M)

Build complete.
```

> Nota: `make plan` chiama automaticamente `build-lambdas`. Puoi saltare questo step e andare direttamente al prossimo.

---

## Step 4 — Terraform Plan

```bash
make plan
```

Questo esegue il build delle Lambda e poi `terraform plan`. Leggi attentamente l'output prima di procedere.

Vedrai che Terraform creerà circa **35-40 risorse**:
- 1 RDS instance
- 1 Cognito User Pool + 1 App Client
- 1 IAM Role + 1 Policy
- 2 Security Groups
- 1 DB Subnet Group
- 10 Lambda Functions
- 1 API Gateway REST API + risorse/metodi/integrazioni
- 1 API Gateway Deployment + Stage

---

## Step 5 — Terraform Apply

```bash
make apply
```

Durata stimata: **10-15 minuti** (RDS è la parte più lenta).

Output finale:
```
Apply complete! Resources: 38 added, 0 changed, 0 destroyed.

Outputs:

api_url                = "https://xxxxxxxxxx.execute-api.eu-west-1.amazonaws.com/dev"
cognito_app_client_id  = "xxxxxxxxxxxxxxxxxxxxxxxxxx"
cognito_pool_id        = "eu-west-1_XXXXXXXXX"
rds_db_name            = "career_tracker"
rds_host               = "career-tracker-dev-db.xxxxxxxx.eu-west-1.rds.amazonaws.com"
rds_port               = 5432
```

Salva questi valori — ti serviranno nei prossimi step.

```bash
make get-outputs   # per rivederli in formato JSON in qualsiasi momento
```

---

## Step 6 — Applica lo schema al database

```bash
make apply-schema
```

Il comando legge automaticamente `rds_host` e `rds_db_name` dagli output Terraform e applica `backend/schema.sql`.

Ti chiederà la password del DB (quella che hai impostato in `terraform.tfvars`).

Verifica:
```
Applying schema to career-tracker-dev-db.xxx.eu-west-1.rds.amazonaws.com/career_tracker...
CREATE EXTENSION
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER
```

---

## Step 7 — Configura il frontend

```bash
cp frontend/.env.local.example frontend/.env.local
```

Apri `frontend/.env.local` e incolla i valori dagli output Terraform:

```bash
NEXT_PUBLIC_API_URL=https://xxxxxxxxxx.execute-api.eu-west-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=eu-west-1
```

---

## Step 8 — Testa in locale

```bash
make frontend-install   # npm install nella cartella frontend
make frontend-dev       # avvia su http://localhost:3000
```

Fai un test end-to-end completo:
- [ ] Signup con email reale
- [ ] Ricevi email con codice di conferma
- [ ] Conferma email → redirect a login
- [ ] Login → redirect a dashboard
- [ ] Aggiungi almeno 2 job entries
- [ ] Vedi grafici aggiornati
- [ ] Modifica e cancella una entry
- [ ] Cambia password da Profile
- [ ] Logout e re-login

---

## Step 9 — Deploy frontend su Vercel

```bash
cd frontend

# Prima volta: installa la CLI e fai login
npm install -g vercel
vercel login

# Deploy
vercel --prod
```

Vercel ti chiede:
- **Set up and deploy?** → Y
- **Which scope?** → il tuo account
- **Link to existing project?** → N (prima volta)
- **Project name?** → `career-tracker`
- **Directory?** → `./` (sei già in `frontend/`)
- **Override settings?** → N

Poi vai su **Vercel Dashboard → Project → Settings → Environment Variables** e aggiungi le stesse 4 variabili di `.env.local`.

Rideploya dopo aver aggiunto le variabili:
```bash
vercel --prod
```

---

## Checklist finale

```
Infrastructure
  [x] AWS CLI configurato con credenziali valide
  [ ] terraform.tfvars creato con db_password
  [ ] make init completato senza errori
  [ ] make plan: ~38 risorse da creare, nessun errore
  [ ] make apply completato (~15 min)
  [ ] make apply-schema: schema applicato, tabelle create

Backend
  [ ] make build-lambdas: 10 zip creati in backend/.lambda_build/
  [ ] Test POST /auth/signup via curl o Postman
  [ ] Test POST /auth/login → ricevi accessToken

Frontend locale
  [ ] frontend/.env.local configurato con output Terraform
  [ ] make frontend-dev: avvia su localhost:3000
  [ ] Test end-to-end: signup → onboarding → dashboard

Frontend produzione
  [ ] vercel --prod: deploy completato
  [ ] Variabili env aggiunte in Vercel Dashboard
  [ ] Test end-to-end su URL Vercel
```

---

## Comandi utili dopo il deploy

```bash
# Vedere i log in tempo reale
make logs-signup       # Lambda auth-signup
make logs-login        # Lambda auth-login
make logs-dashboard    # Lambda dashboard-metrics

# Rideploy rapido delle Lambda dopo modifiche al codice
make deploy-lambdas    # build + aws lambda update-function-code

# Distruggere tutta l'infrastruttura (⚠ irreversibile)
make destroy
```

---

## Troubleshooting

**`terraform plan` fallisce con "no such file or directory" sugli zip**
→ Esegui `make init` (crea i placeholder) e poi `make plan`

**Lambda risponde 500 con "Cannot find module 'pg'"**
→ Esegui `make build-lambdas` poi `make deploy-lambdas`. I node_modules non erano bundlati.

**RDS non raggiungibile dalla Lambda**
→ Verifica che il Security Group `lambda-sg` sia nel campo `security_group_ids` della VPC config della Lambda, e che l'ingress del Security Group RDS permetta la porta 5432 dal `lambda-sg`.

**Cognito: "UserNotConfirmedException" al login**
→ L'utente non ha confermato l'email. Usa `POST /auth/confirm` con il codice ricevuto.

**API Gateway risponde 403 "Missing Authentication Token"**
→ Il path nell'URL è sbagliato. Verifica che l'URL includa lo stage: `.../dev/auth/login` (non `.../auth/login`)
