# Backend — Documentazione Funzionale

> Stack: Node.js 18.x · AWS Lambda · PostgreSQL su RDS · AWS Cognito · API Gateway · Terraform

---

## Indice

1. [Visione d'insieme](#1-visione-dinsieme)
2. [Servizi AWS utilizzati](#2-servizi-aws-utilizzati)
3. [Database — PostgreSQL su RDS](#3-database--postgresql-su-rds)
4. [Autenticazione — AWS Cognito](#4-autenticazione--aws-cognito)
5. [Lambda Functions](#5-lambda-functions)
6. [API Gateway](#6-api-gateway)
7. [IAM — Ruoli e Policy](#7-iam--ruoli-e-policy)
8. [Infrastruttura Terraform](#8-infrastruttura-terraform)
9. [Flussi end-to-end](#9-flussi-end-to-end)
10. [Variabili d'ambiente](#10-variabili-dambiente)
11. [Sicurezza](#11-sicurezza)

---

## 1. Visione d'insieme

Il back end è **completamente serverless**: non esiste un server persistente. Ogni richiesta HTTP arriva ad **API Gateway**, che la inoltra alla **Lambda Function** corrispondente. La Lambda apre una connessione verso **RDS PostgreSQL** per leggere/scrivere dati, e interagisce con **AWS Cognito** per tutto ciò che riguarda identità e token JWT.

```
Client
  │
  │  HTTPS REST
  ▼
API Gateway  ──────────────────────────────────────────────┐
  │                                                        │
  │  Lambda Proxy Integration                              │
  ▼                                                        │
Lambda Function (es. jobs-list)                            │
  │                    │                                   │
  │ pg.Client          │ AWS SDK - CognitoISP              │
  ▼                    ▼                                   │
RDS PostgreSQL     Cognito User Pool                       │
(career_tracker)   (verifica token JWT)                    │
                                                           │
                     ◄─────────────────────────────────────┘
                     Response JSON
```

Ogni Lambda è **stateless**: apre la connessione al DB all'inizio della chiamata e la chiude nel blocco `finally`. Non c'è connection pooling persistente (sufficiente per il volume MVP; RDS Proxy è l'upgrade naturale in futuro).

---

## 2. Servizi AWS utilizzati

### 2.1 AWS Lambda

| Parametro | Valore |
|---|---|
| Runtime | Node.js 18.x |
| Timeout | 30 secondi |
| Memoria | 256 MB |
| Regione | eu-west-1 (Ireland) |
| Trigger | API Gateway (Lambda Proxy) |
| Networking | VPC default, Security Group dedicato |

Le funzioni sono deployate come file `.zip` generati a partire dalle directory in `backend/functions/`. Ogni funzione ha il proprio `index.js` ed è autonoma (non condivide codice tramite layer, per semplicità MVP).

### 2.2 Amazon RDS — PostgreSQL

| Parametro | Valore |
|---|---|
| Engine | PostgreSQL 15.4 |
| Instance class | db.t3.micro (free tier) |
| Storage | 20 GB gp2, auto-scaling fino a 100 GB |
| Multi-AZ | No (MVP) |
| Publicly accessible | No |
| SSL | Richiesto (`ssl: { rejectUnauthorized: false }`) |
| Backup retention | 7 giorni |
| Encryption at rest | Sì |

Il database **non è accessibile da internet**: accetta connessioni solo dal Security Group assegnato alle Lambda (regola ingress su porta 5432).

### 2.3 AWS Cognito

Gestisce interamente il ciclo di vita degli utenti: registrazione, verifica email, login, refresh token e cambio password. Il back end **non memorizza mai le password**: sono in carico esclusivo a Cognito.

| Componente | Dettaglio |
|---|---|
| User Pool | `career-tracker-dev-users` |
| App Client | `career-tracker-dev-web` (no client secret) |
| Auth flow | `USER_PASSWORD_AUTH` + `ALLOW_REFRESH_TOKEN_AUTH` |
| Verifica email | Obbligatoria — codice a 6 cifre via email |
| Token access | Durata 1 ora |
| Token refresh | Durata 30 giorni |
| Password policy | Min 8 caratteri, maiuscola, minuscola, numero, simbolo |

### 2.4 API Gateway (REST)

Funge da **front door HTTP** per tutte le Lambda. Ogni risorsa/metodo usa l'integrazione **AWS_PROXY**: il request body, gli header e i path parameters vengono passati direttamente alla Lambda come evento JSON, e la risposta della Lambda viene restituita as-is al client.

CORS è abilitato su ogni risorsa tramite un metodo `OPTIONS` con integrazione MOCK che restituisce gli header `Access-Control-Allow-*`.

### 2.5 IAM

Un singolo **Lambda Execution Role** con policy custom che concede:
- `logs:*` su CloudWatch Logs
- `rds:Describe*` + `rds-db:connect`
- `secretsmanager:GetSecretValue`
- `ec2:*NetworkInterface*` (necessario per Lambda in VPC)
- `cognito-idp:AdminInitiateAuth`, `AdminGetUser`, ecc. sul solo User Pool specifico

---

## 3. Database — PostgreSQL su RDS

### Schema

```sql
users
  id           UUID  PK
  cognito_sub  VARCHAR(256)  UNIQUE  -- sub del JWT Cognito
  email        VARCHAR(254)  UNIQUE
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

jobs
  id           UUID  PK
  user_id      UUID  FK → users(id)  ON DELETE CASCADE
  company      VARCHAR(255)
  job_title    VARCHAR(255)
  start_date   DATE
  end_date     DATE  (NULL = posizione corrente)
  base_salary  DECIMAL(12,2)  CHECK > 0
  bonus        DECIMAL(12,2)  CHECK >= 0
  location     VARCHAR(255)
  currency     VARCHAR(3)  DEFAULT 'EUR'
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

CONSTRAINT end_after_start: end_date IS NULL OR end_date > start_date
```

### Indici

| Indice | Colonne | Motivo |
|---|---|---|
| `idx_jobs_user_id` | `user_id` | Tutte le query filtrano per utente |
| `idx_jobs_start_date` | `start_date` | Ordinamento cronologico |
| `idx_jobs_user_start` | `(user_id, start_date DESC)` | Query dashboard (già ordinata) |

### Trigger `updated_at`

Un trigger PostgreSQL aggiorna automaticamente la colonna `updated_at` ad ogni `UPDATE` su entrambe le tabelle, evitando di doverlo gestire a livello applicativo.

### Isolamento dei dati

Ogni query che legge o modifica la tabella `jobs` include sempre `WHERE user_id = $N`, dove `$N` è ricavato dal `cognito_sub` estratto dal JWT. In questo modo un utente non può mai accedere ai dati di un altro, anche in caso di bug nel routing.

---

## 4. Autenticazione — AWS Cognito

### Flusso di registrazione

```
1. Client  → POST /auth/signup  { email, password }
2. Lambda  → cognito.signUp()
3. Cognito → invia email con codice a 6 cifre
4. Lambda  → INSERT INTO users (cognito_sub, email)
5. Client  → POST /auth/confirm  { email, code }
6. Lambda  → cognito.confirmSignUp()
7. Client  → POST /auth/login
```

### Flusso di login

```
1. Client  → POST /auth/login  { email, password }
2. Lambda  → cognito.initiateAuth({ AuthFlow: 'USER_PASSWORD_AUTH' })
3. Cognito → restituisce { AccessToken, IdToken, RefreshToken }
4. Lambda  → SELECT user da DB per id/email
5. Client  riceve i 3 token + userId
```

Il client salva i token in `localStorage` e invia l'`AccessToken` come `Authorization: Bearer <token>` in ogni richiesta autenticata.

### Verifica del token nelle Lambda

Le Lambda non validano il JWT manualmente (nessuna chiave pubblica JWKS hardcoded). Invocano invece `cognito.getUser({ AccessToken })`: se il token è scaduto o manomesso, Cognito risponde con `NotAuthorizedException` e la Lambda restituisce `401`.

```
Lambda auth check:
  const user = await cognito.getUser({ AccessToken: token }).promise()
  const sub = user.UserAttributes.find(a => a.Name === 'sub').Value
  → usa sub per cercare l'utente nel DB
```

---

## 5. Lambda Functions

### Pattern comune a tutte le funzioni

```javascript
exports.handler = async (event) => {
  // 1. Gestione preflight CORS
  if (event.httpMethod === 'OPTIONS') return response(200, {})

  // 2. Estrazione e validazione del token Bearer
  const token = extractToken(event)
  if (!token) return response(401, { error: '...' })

  // 3. Connessione al DB (pg.Client, SSL)
  const db = new Client({ ... })

  try {
    // 4. Verifica identità su Cognito
    const cognitoUser = await cognito.getUser({ AccessToken: token }).promise()
    const sub = cognitoUser.UserAttributes.find(a => a.Name === 'sub').Value

    // 5. Business logic + query DB
    await db.connect()
    const result = await db.query(...)

    // 6. Risposta con headers CORS
    return response(200, result.rows)
  } catch (err) {
    // 7. Gestione errori Cognito e generici
    return response(500, { error: err.message })
  } finally {
    await db.end()  // sempre chiusa
  }
}
```

---

### `auth-signup`

**POST /auth/signup**

Crea un nuovo account. Chiama `cognito.signUp()` e, se va a buon fine, inserisce l'utente nel DB con il `cognito_sub` restituito da Cognito.

| Input | `{ email, password }` |
|---|---|
| Output OK | `201 { userId, message }` |
| Errori gestiti | `UsernameExistsException` → 409, `InvalidPasswordException` → 400 |

---

### `auth-login`

**POST /auth/login**

Autentica l'utente tramite `cognito.initiateAuth` con flow `USER_PASSWORD_AUTH`. Restituisce i 3 token JWT più i dati base dell'utente dal DB.

| Input | `{ email, password }` |
|---|---|
| Output OK | `200 { userId, email, accessToken, idToken, refreshToken, expiresIn }` |
| Errori gestiti | `NotAuthorizedException` → 401, `UserNotConfirmedException` → 403, `UserNotFoundException` → 401 |

L'errore `UserNotFoundException` risponde con lo stesso messaggio di `NotAuthorizedException` per non rivelare se un'email è registrata (security by obscurity).

---

### `auth-confirm`

**POST /auth/confirm**

Conferma l'email con il codice a 6 cifre inviato da Cognito. Non richiede autenticazione (l'utente non ha ancora un token).

| Input | `{ email, code }` |
|---|---|
| Output OK | `200 { confirmed: true }` |
| Errori gestiti | `CodeMismatchException` → 400, `ExpiredCodeException` → 400 |

---

### `auth-change-password`

**PUT /auth/password** — _Autenticazione richiesta_

Cambia la password dell'utente corrente chiamando `cognito.changePassword()` con l'`AccessToken` Bearer.

| Input | `{ oldPassword, newPassword }` |
|---|---|
| Output OK | `200 { success: true }` |
| Errori gestiti | `NotAuthorizedException` → 401, `InvalidPasswordException` → 400, `LimitExceededException` → 429 |

---

### `user-get`

**GET /user** — _Autenticazione richiesta_

Recupera il profilo dell'utente corrente dal DB usando il `cognito_sub` estratto dal token.

| Output OK | `200 { id, email, createdAt }` |
|---|---|

---

### `jobs-create`

**POST /jobs** — _Autenticazione richiesta_

Inserisce un nuovo record nella tabella `jobs`. Valida che `baseSalary > 0` e che `endDate > startDate` (se fornita).

| Input | `{ company, jobTitle, startDate, endDate?, baseSalary, bonus?, location, currency? }` |
|---|---|
| Output OK | `201 { jobId, created: true }` |

---

### `jobs-list`

**GET /jobs** — _Autenticazione richiesta_

Restituisce tutte le voci della tabella `jobs` per l'utente corrente, ordinate per `start_date DESC`.

| Output OK | `200 [ { id, company, jobTitle, startDate, endDate, baseSalary, bonus, location, currency, createdAt }, ... ]` |
|---|---|

---

### `jobs-update`

**PUT /jobs/:jobId** — _Autenticazione richiesta_

Aggiorna un record esistente. La query `WHERE id = $jobId AND user_id = $userId` garantisce che l'utente possa modificare solo le proprie voci. Se il record non esiste o appartiene a un altro utente, risponde `404`.

| Input | stessi campi di `jobs-create` |
|---|---|
| Output OK | `200 { updated: true, jobId }` |

---

### `jobs-delete`

**DELETE /jobs/:jobId** — _Autenticazione richiesta_

Elimina un record. Stesso meccanismo di ownership check di `jobs-update`.

| Output OK | `200 { deleted: true }` |
|---|---|

---

### `dashboard-metrics`

**GET /dashboard/metrics** — _Autenticazione richiesta_

La funzione più ricca. Recupera tutti i `jobs` dell'utente e calcola:

#### `currentSalary`
`base_salary + bonus` dell'ultimo job (ordinato per `start_date DESC`).

#### `yearsInCareer`
Differenza in anni interi tra `start_date` del primo job e oggi.

#### `totalGrowthPercent`
```
((currentSalary - firstSalary) / firstSalary) * 100
```

#### `yoyGrowthData`
Per ogni anno dalla prima assunzione ad oggi, identifica il job attivo quell'anno (quello con la `start_date` più recente che copre l'anno) e calcola:
```
((salaryAnno - salaryAnnoPrecedente) / salaryAnnoPrecedente) * 100
```
Restituisce un array `[{ year, growth, salary }]`. Il primo anno ha `growth: null`.

#### `salaryTimeline`
Array `[{ year, salary, salaryInflationAdjusted }]`.

`salaryInflationAdjusted` è la **baseline inflazionata**: il primo stipendio rivalutato anno per anno con le percentuali HICP Eurozona hardcodate:

```javascript
const INFLATION_RATES = {
  2018: 1.9, 2019: 1.3, 2020: -0.1, 2021: 2.6,
  2022: 8.4, 2023: 5.3, 2024: 2.4
}
```

Mostra visivamente quante volte il salario nominale supera (o non raggiunge) il potere d'acquisto iniziale rivalutato.

#### `realGrowthPercent`
```
((currentSalary - firstSalary × ∏(1 + inflazione_anno)) / firstSalary × ∏(...)) * 100
```
La crescita reale è positiva solo se il salario nominale è cresciuto **più** dell'inflazione cumulata.

---

## 6. API Gateway

### Struttura delle risorse

```
/
├── /auth
│   ├── POST /signup       → lambda: auth-signup
│   ├── POST /login        → lambda: auth-login
│   ├── POST /confirm      → lambda: auth-confirm
│   └── PUT  /password     → lambda: auth-change-password
├── /user
│   └── GET                → lambda: user-get
├── /jobs
│   ├── POST               → lambda: jobs-create
│   ├── GET                → lambda: jobs-list
│   └── /{jobId}
│       ├── PUT            → lambda: jobs-update
│       └── DELETE         → lambda: jobs-delete
└── /dashboard
    └── /metrics
        └── GET            → lambda: dashboard-metrics
```

### Integrazione Lambda Proxy

Tutte le route usano `AWS_PROXY`: API Gateway non trasforma né body né headers — li passa integralmente alla Lambda come evento JSON. La Lambda ha pieno controllo sulla risposta (status code, headers, body).

### CORS

Su ogni risorsa esiste un metodo `OPTIONS` con integrazione MOCK che risponde immediatamente con:
```
Access-Control-Allow-Origin:  *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Per MVP è `*`. In produzione va ristretto al dominio Vercel.

### Stage

Esiste un unico stage `dev`. L'URL finale ha la forma:
```
https://<api-id>.execute-api.eu-west-1.amazonaws.com/dev
```

---

## 7. IAM — Ruoli e Policy

### Lambda Execution Role

Un singolo ruolo `career-tracker-dev-lambda-role` assegnato a tutte le 10 funzioni. Le policy seguono il **principio del minimo privilegio**:

| Azione | Risorsa | Motivo |
|---|---|---|
| `logs:CreateLogGroup/Stream`, `PutLogEvents` | `*` | CloudWatch Logs |
| `ec2:CreateNetworkInterface`, `DescribeNetworkInterfaces`, `DeleteNetworkInterface` | `*` | Lambda in VPC |
| `rds-db:connect` | `*` | Connessione RDS (IAM auth opzionale) |
| `secretsmanager:GetSecretValue` | `*` | Per futura rotazione password DB |
| `cognito-idp:Admin*` | Solo l'ARN del User Pool specifico | Operazioni Cognito |

---

## 8. Infrastruttura Terraform

### File e responsabilità

| File | Contenuto |
|---|---|
| `main.tf` | Provider AWS, locals (`name_prefix`, `common_tags`) |
| `variables.tf` | Input: region, app_name, environment, db_username, db_password, db_name |
| `rds.tf` | DB instance, subnet group, security groups (RDS + Lambda) |
| `cognito.tf` | User Pool, App Client, password policy, email verification |
| `iam.tf` | Lambda execution role + policy |
| `lambda.tf` | `archive_file` per tutti e 10 gli zip + `aws_lambda_function` via `for_each` |
| `api_gateway.tf` | REST API, tutte le risorse/metodi, deployment, stage |
| `outputs.tf` | api_url, rds_host, rds_port, rds_db_name, cognito IDs, lambda role ARN |
| `backend.tf` | Configurazione backend (locale per MVP) |
| `modules/api_route/` | Modulo riutilizzabile: method + integration + CORS OPTIONS + Lambda permission |

### Modulo `api_route`

Evita la duplicazione di ~5 risorse Terraform per ogni route. Accetta:
- `rest_api_id`, `resource_id`, `http_method`
- `lambda_invoke_arn`, `function_name`, `execution_arn`

Crea internamente: `aws_api_gateway_method`, `aws_api_gateway_integration`, `aws_lambda_permission`, e il metodo OPTIONS con MOCK integration per CORS.

### Deployment

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# → imposta db_password

make init    # terraform init
make plan    # terraform plan -out=tfplan
make apply   # terraform apply tfplan
make get-outputs   # mostra tutti gli output come JSON
```

---

## 9. Flussi end-to-end

### Registrazione completa

```
Browser                    API Gateway        Lambda             Cognito         DB
  │                             │                │                  │             │
  ├─ POST /auth/signup ────────►│                │                  │             │
  │   { email, password }       ├──────────────►│                  │             │
  │                             │                ├─ signUp() ──────►│             │
  │                             │                │◄── UserSub ──────┤             │
  │                             │                ├─ INSERT users ──────────────►  │
  │                             │                │◄── id ─────────────────────── │
  │◄── 201 { userId } ─────────┤◄──────────────┤                  │             │
  │                             │                │                  │             │
  │  [utente controlla email]   │                │                  │             │
  │                             │                │                  │             │
  ├─ POST /auth/confirm ───────►│                │                  │             │
  │   { email, code }           ├──────────────►│                  │             │
  │                             │                ├─ confirmSignUp()►│             │
  │◄── 200 { confirmed } ──────┤◄──────────────┤◄── OK ───────────┤             │
```

### Richiesta autenticata (es. GET /jobs)

```
Browser                    API Gateway        Lambda             Cognito         DB
  │                             │                │                  │             │
  ├─ GET /jobs ────────────────►│                │                  │             │
  │  Authorization: Bearer xyz  ├──────────────►│                  │             │
  │                             │                ├─ getUser(xyz) ──►│             │
  │                             │                │◄── sub="abc" ────┤             │
  │                             │                ├─ SELECT jobs WHERE user_id ──►│
  │                             │                │◄── rows ────────────────────── │
  │◄── 200 [ ... ] ────────────┤◄──────────────┤                  │             │
```

---

## 10. Variabili d'ambiente

Ogni Lambda riceve queste env vars impostate da Terraform:

| Variabile | Esempio | Fonte |
|---|---|---|
| `DB_HOST` | `career-tracker-dev-db.xxx.eu-west-1.rds.amazonaws.com` | Terraform output RDS |
| `DB_PORT` | `5432` | Costante |
| `DB_USER` | `postgres` | `var.db_username` |
| `DB_PASSWORD` | `***` | `var.db_password` (sensitive) |
| `DB_NAME` | `career_tracker` | `var.db_name` |
| `COGNITO_REGION` | `eu-west-1` | `var.region` |
| `COGNITO_USER_POOL_ID` | `eu-west-1_XXXXX` | Terraform output Cognito |
| `COGNITO_CLIENT_ID` | `xxxxxxxxxx` | Terraform output Cognito |
| `NODE_ENV` | `dev` | `var.environment` |

---

## 11. Sicurezza

| Aspetto | Implementazione |
|---|---|
| Password utente | Mai toccate dal back end — gestite interamente da Cognito |
| Token JWT | Validati chiamando `cognito.getUser()` ad ogni richiesta |
| Isolamento dati | Ogni query su `jobs` include `AND user_id = $userId` |
| Rete DB | RDS non pubblica, accesso solo dal Lambda Security Group |
| Credenziali DB | In env vars Lambda (in chiaro nei log è un rischio: usare Secrets Manager in produzione) |
| HTTPS | Forzato da API Gateway — non c'è HTTP plain |
| Enumerazione utenti | Login restituisce sempre `401` sia per email inesistente che per password sbagliata |
| Rate limiting | Cognito ha throttling nativo; API Gateway usage plan non configurato per MVP |
| CORS | `*` per MVP — da restringere al dominio Vercel in produzione |
