# Frontend — Documentazione Funzionale

> Stack: Next.js 14 (Pages Router) · TypeScript · Tailwind CSS · Recharts · Axios

---

## Indice

1. [Visione d'insieme](#1-visione-dinsieme)
2. [Struttura del progetto](#2-struttura-del-progetto)
3. [Routing e pagine](#3-routing-e-pagine)
4. [Componenti](#4-componenti)
5. [Hooks](#5-hooks)
6. [Utilities](#6-utilities)
7. [Gestione stato e autenticazione](#7-gestione-stato-e-autenticazione)
8. [Stile e design system](#8-stile-e-design-system)
9. [Flussi utente](#9-flussi-utente)
10. [Configurazione e deployment](#10-configurazione-e-deployment)

---

## 1. Visione d'insieme

Il frontend è una **Single Page Application** costruita con Next.js 14 usando il **Pages Router** (non App Router). Viene deployata su **Vercel** e parla con il back end esclusivamente tramite chiamate REST all'API Gateway.

Non c'è SSR (Server Side Rendering) per le pagine protette: tutto il fetching avviene lato client dopo il caricamento della pagina. Questo è un trade-off consapevole per il MVP — semplifica la gestione dei token JWT (non serve cookie httpOnly/SSR token forwarding).

```
Vercel CDN
  └── Next.js (Pages Router)
        │
        ├── pages/          → route pubbliche + protette
        ├── components/     → UI riutilizzabile
        ├── hooks/          → stato e side effect
        └── utils/          → API client, auth helpers, calcoli
              │
              │  axios (Bearer token)
              ▼
        API Gateway → Lambda
```

---

## 2. Struttura del progetto

```
frontend/
├── pages/
│   ├── _app.tsx            → Provider globali, layout con Navbar
│   ├── index.tsx           → Landing page
│   ├── onboarding.tsx      → Primo accesso: aggiunta del primo job
│   ├── dashboard.tsx       → Dashboard principale (protetta)
│   ├── profile.tsx         → Profilo e cambio password (protetta)
│   └── auth/
│       ├── login.tsx       → Form login
│       └── signup.tsx      → Form registrazione + conferma email
│
├── components/
│   ├── Auth/
│   │   ├── SignupForm.tsx
│   │   ├── LoginForm.tsx
│   │   └── ConfirmEmail.tsx
│   ├── Dashboard/
│   │   ├── MetricsCards.tsx
│   │   ├── SalaryChart.tsx
│   │   ├── YoYChart.tsx
│   │   └── JobsList.tsx
│   ├── Jobs/
│   │   └── JobForm.tsx
│   ├── Navigation/
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   └── Common/
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── useAuth.ts          → Context + login/logout
│   ├── useJobs.ts          → CRUD salary entries
│   └── useDashboard.ts     → Fetch metriche dashboard
│
├── utils/
│   ├── api.ts              → Axios client configurato
│   ├── auth.ts             → Token storage (localStorage)
│   └── calculations.ts     → Logica YoY, inflazione, crescita
│
└── styles/
    └── globals.css         → Tailwind base + utility classes custom
```

---

## 3. Routing e pagine

### `pages/_app.tsx` — Root dell'applicazione

Avvolge tutta l'app con:
- `ErrorBoundary` — cattura errori React non gestiti
- `AuthProvider` — context di autenticazione disponibile in tutti i componenti
- `Navbar` — header persistente su ogni pagina
- Import di `globals.css` (Tailwind)

```tsx
<ErrorBoundary>
  <AuthProvider>
    <Navbar />
    <Component {...pageProps} />
  </AuthProvider>
</ErrorBoundary>
```

---

### `pages/index.tsx` — Landing page

Pagina pubblica. Se l'utente è già autenticato viene reindirizzato a `/dashboard` automaticamente. Contiene:
- Hero con headline e CTA
- Griglia di 4 feature card
- Sezione CTA finale

Non fa nessuna chiamata API.

---

### `pages/auth/signup.tsx` — Registrazione

Gestisce due step in sequenza nello stesso URL:

1. **Step 1 — Form**: `<SignupForm />` raccoglie email e password, chiama `POST /auth/signup`. In caso di successo salva l'email in stato locale e passa allo step 2.
2. **Step 2 — Conferma**: `<ConfirmEmail />` raccoglie il codice a 6 cifre, chiama `POST /auth/confirm`, poi reindirizza a `/auth/login?confirmed=true`.

Se l'utente arriva da `/auth/login` con query param `?confirm=<email>` (email non confermata), entra direttamente allo step 2.

---

### `pages/auth/login.tsx` — Login

Mostra `<LoginForm />`. Se il query param `?confirmed=true` è presente, mostra un banner di successo in cima al form.

Dopo il login, il hook `useAuth.login()` salva i token e reindirizza a `/dashboard`.

---

### `pages/onboarding.tsx` — Primo accesso

Pagina protetta che guida l'utente all'inserimento del primo job.

Logica:
1. Al mount chiama `fetchJobs()`
2. Se l'utente ha già job → reindirizza subito a `/dashboard`
3. Altrimenti mostra il `<JobForm />`
4. Dopo il submit mostra un messaggio di successo e reindirizza a `/dashboard` dopo 1.2 secondi

---

### `pages/dashboard.tsx` — Dashboard principale

Pagina protetta (wrappata in `<ProtectedRoute>`). Al mount chiama `fetchMetrics()` dall'hook `useDashboard`.

Struttura del contenuto:
```
MetricsCards     ← 4 KPI numerici
└─ SalaryChart   ← line chart timeline (3/5 larghezza)
└─ YoYChart      ← bar chart crescita YoY (2/5 larghezza)
   └─ Inflation note  ← frase contestuale sulla crescita reale
JobsList         ← lista + add/edit/delete
```

Il prop `onDataChange` passato a `<JobsList>` triggera un nuovo `fetchMetrics()` dopo ogni operazione CRUD, mantenendo i grafici sincronizzati.

---

### `pages/profile.tsx` — Profilo utente

Pagina protetta. Tre sezioni:
1. **Account info** — email e data di creazione (read-only)
2. **Change password** — form a 3 campi, chiama `PUT /auth/password`
3. **Sign out** — bottone che chiama `logout()` dal context

---

## 4. Componenti

### `Auth/SignupForm`

Form controllato con 3 campi: email, password, conferma password. Validazione client-side del match password prima della chiamata API. Gestisce lo stato di loading e mostra errori inline.

**Props:** `{ onSignupSuccess: (email: string) => void }`

---

### `Auth/LoginForm`

Form con email e password. Se l'errore API contiene "not confirmed", reindirizza automaticamente a `/auth/signup?confirm=<email>` invece di mostrare un errore generico.

Non ha props (usa direttamente `useAuth().login`).

---

### `Auth/ConfirmEmail`

Mostra un banner informativo con l'email a cui è stato inviato il codice e un input con stile monospace centrato (UX pensata per i codici numerici). Il bottone di submit è disabilitato finché il codice non raggiunge 6 caratteri.

**Props:** `{ email: string }`

---

### `Dashboard/MetricsCards`

Griglia di 4 card (2 colonne su mobile, 4 su desktop). Ogni card ha label, valore e sottotitolo. I valori di crescita (`totalGrowthPercent`, `realGrowthPercent`) hanno colore dinamico: verde se ≥ 0, rosso se negativo.

**Props:** `{ currentSalary, yearsInCareer, totalGrowthPercent, realGrowthPercent }`

---

### `Dashboard/SalaryChart`

Line chart Recharts con due serie:
- **Nominal salary** (linea blu piena) — lo stipendio reale anno per anno
- **Inflation-adjusted baseline** (linea grigia tratteggiata) — quanto dovrebbe essere il primo stipendio se rivalutato per inflazione

Tooltip custom con box dark. Asse Y formattato come `€Xk`. Se non ci sono dati, mostra un placeholder testuale.

**Props:** `{ data: SalaryTimelinePoint[] }`

---

### `Dashboard/YoYChart`

Bar chart Recharts con colori dinamici per barra: verde per crescita positiva, rosso per negativa. `ReferenceLine` a `y=0` come baseline visiva.

Filtra i dati rimuovendo il primo anno (che ha `growth: null`).

**Props:** `{ data: YoYDataPoint[] }`

---

### `Dashboard/JobsList`

Il componente più complesso del frontend. Gestisce lo stato di:
- Lista job (da `useJobs`)
- Form di creazione (toggle `showForm`)
- Form di editing inline (stato `editingJob`)
- Conferma eliminazione inline (stato `deleteConfirm`)

Le azioni di edit e delete appaiono solo al hover sulla riga (`group-hover:opacity-100`). La conferma di delete è inline sotto la riga, non in un modal, per ridurre la complessità.

**Props:** `{ onDataChange?: () => void }`

---

### `Jobs/JobForm`

Form generico usato sia per creazione che per editing. Quando riceve la prop `job`, pre-popola tutti i campi tramite `useEffect`. Ha 8 campi: company, jobTitle, startDate, endDate, baseSalary, bonus, location, currency (select).

`endDate` ha l'attributo `min={startDate}` per prevenire selezioni invalide lato browser.

**Props:** `{ job?: Job | null, onSubmit: (payload) => Promise<void>, onCancel: () => void }`

---

### `Navigation/Navbar`

Header fisso (`sticky top-0`). In stato autenticato mostra i link di navigazione (nascosti su mobile, visibili dal menu dropdown) e l'avatar con l'iniziale dell'email. In stato non autenticato mostra "Sign in" e "Get started".

Il menu dropdown si chiude automaticamente al click su qualsiasi voce.

---

### `Navigation/ProtectedRoute`

Guard per le pagine autenticate. Controlla `isLoggedIn` da `useAuth`:
- Se `loading` è true → mostra `LoadingSpinner` centrato
- Se non autenticato → `router.replace('/auth/login')`
- Se autenticato → renderizza `children`

Usa `replace` invece di `push` per evitare che l'utente possa tornare indietro alla pagina protetta con il tasto back del browser.

---

### `Common/LoadingSpinner`

Spinner CSS puro (no libreria). Tre dimensioni: `sm` (16px), `md` (32px), `lg` (48px). Usato inline nei bottoni durante il loading e come full-page loader.

---

### `Common/ErrorBoundary`

Class component React che intercetta gli errori non gestiti nell'albero dei figli. Mostra un fallback con messaggio di errore e bottone "Try again" che resetta lo stato. Logga l'errore su console con `componentDidCatch`.

---

## 5. Hooks

### `useAuth`

Context provider che gestisce lo stato di autenticazione globale.

**Stato:**
- `user: User | null` — profilo utente (`{ id, email, createdAt }`)
- `loading: boolean` — true durante il check iniziale del token
- `isLoggedIn: boolean` — shorthand per `!!user`

**Al mount** — controlla se esiste un token valido in localStorage. Se sì, chiama `GET /user` per caricare il profilo. Se la chiamata fallisce (token scaduto), pulisce i token.

**`login(email, password)`** — chiama `POST /auth/login`, salva i token, carica il profilo utente.

**`logout()`** — pulisce i token, resetta `user`, reindirizza a `/auth/login`.

Il provider è implementato con `createElement` invece di JSX per evitare l'import di React nelle versioni dove non è strettamente necessario.

---

### `useJobs`

Hook per il CRUD delle salary entry.

**Stato:**
- `jobs: Job[]`
- `loading: boolean`
- `error: string | null`

**Metodi:**
- `fetchJobs()` — `GET /jobs`
- `createJob(payload)` — `POST /jobs` + `fetchJobs()`
- `updateJob(id, payload)` — `PUT /jobs/:id` + `fetchJobs()`
- `deleteJob(id)` — `DELETE /jobs/:id` + rimozione ottimistica dallo stato locale

`deleteJob` usa aggiornamento ottimistico (rimuove subito dalla lista senza re-fetch) per una UX più reattiva.

---

### `useDashboard`

Hook semplice per il fetch delle metriche aggregate.

**Stato:**
- `metrics: DashboardMetrics | null`
- `loading: boolean`
- `error: string | null`

**Metodi:**
- `fetchMetrics()` — `GET /dashboard/metrics`

`fetchMetrics` è wrappato in `useCallback` per poter essere usato sicuro come dipendenza in `useEffect` senza loop infiniti.

---

## 6. Utilities

### `utils/api.ts` — Axios client

Istanza Axios pre-configurata con:
- `baseURL` = `NEXT_PUBLIC_API_URL`
- `timeout` = 30 secondi
- **Request interceptor**: aggiunge automaticamente `Authorization: Bearer <token>` se presente in localStorage
- **Response interceptor**: su `401` pulisce i token e reindirizza a `/auth/login`

`getErrorMessage(error)` è un helper che estrae il messaggio leggibile da qualsiasi tipo di errore (AxiosError, Error generico, unknown).

---

### `utils/auth.ts` — Token management

Astrazione su `localStorage` per i 3 token JWT.

| Funzione | Azione |
|---|---|
| `storeTokens(access, id, refresh)` | Salva i 3 token |
| `getAccessToken()` | Legge il token di accesso |
| `getIdToken()` | Legge l'ID token |
| `clearTokens()` | Rimuove tutti e 3 i token |
| `isTokenExpired(token)` | Decodifica il payload JWT (base64) e verifica `exp` vs `Date.now()` |
| `isAuthenticated()` | `getAccessToken() && !isTokenExpired()` |

Tutte le funzioni controllano `typeof window === 'undefined'` per compatibilità con il rendering lato server di Next.js (anche se le pagine protette non fanno SSR, `_app.tsx` viene eseguito anche server-side).

---

### `utils/calculations.ts` — Logica di business lato client

Contiene tutte le formule di calcolo (usate anche come riferimento per capire cosa fa `dashboard-metrics` Lambda).

| Funzione | Input | Output |
|---|---|---|
| `getCurrentSalary(jobs)` | `Job[]` | `baseSalary + bonus` del job più recente |
| `getYearsInCareer(jobs)` | `Job[]` | Anni interi dal primo `startDate` ad oggi |
| `getTotalGrowthPercent(jobs)` | `Job[]` | `((last - first) / first) * 100` |
| `buildYoYData(jobs)` | `Job[]` | `YoYDataPoint[]` con crescita % per anno |
| `buildSalaryTimeline(jobs)` | `Job[]` | `SalaryTimelinePoint[]` con salary e baseline inflazionata |
| `getRealGrowthPercent(jobs)` | `Job[]` | Crescita % aggiustata per inflazione cumulata |
| `formatCurrency(amount, currency)` | `number, string` | Stringa formattata `€50.000` via `Intl.NumberFormat` |

**Come viene determinato il salary per anno in `buildYoYData` / `buildSalaryTimeline`:**

Per ogni anno viene selezionato il job che era attivo quell'anno (start ≤ fine anno AND end > inizio anno). Se più job si sovrappongono, viene preso quello con la `startDate` più recente (il più recente vince). Se nessun job copre l'anno, quel punto viene saltato.

**Dati inflazione HICP Eurozona (hardcoded per MVP):**
```
2018: 1.9%  2019: 1.3%  2020: -0.1%  2021: 2.6%
2022: 8.4%  2023: 5.3%  2024: 2.4%
```

---

## 7. Gestione stato e autenticazione

### Flusso di stato globale

```
AuthProvider (Context)
  │
  ├── user: User | null
  ├── loading: boolean
  ├── isLoggedIn: boolean
  ├── login()
  └── logout()
        │
        ├── Navbar legge isLoggedIn/user
        ├── ProtectedRoute legge isLoggedIn/loading
        ├── LoginForm usa login()
        └── ProfilePage usa logout()
```

Non vengono usate librerie di state management (Redux, Zustand) — il Context API è sufficiente per questo volume di stato globale.

### Ciclo di vita dei token

```
Login
  └─► storeTokens(access, id, refresh) → localStorage

Ogni richiesta API
  └─► axios interceptor legge getAccessToken()
       └─► aggiunge Authorization: Bearer <token>

Risposta 401
  └─► axios interceptor → clearTokens() + redirect /auth/login

App mount (_app.tsx → AuthProvider)
  └─► isAuthenticated()
       ├── sì → GET /user → setta user in Context
       └── no → user rimane null (pagine protette fanno redirect)
```

---

## 8. Stile e design system

### Palette colori

| Token | Hex | Utilizzo |
|---|---|---|
| `primary` | `#0066cc` | Bottoni principali, link, accenti |
| `primary-dark` | `#004fa3` | Hover stato primary |
| `background` | `#1a1a2e` | Background pagina |
| `background-card` | `#16213e` | Card, navbar, form |
| `background-elevated` | `#0f3460` | Righe hover, dropdown |
| `accent` | `#00d4ff` | Highlights, link secondari |
| `success` | `#10b981` | Valori positivi, badge "Current" |
| `danger` | `#ef4444` | Errori, delete, valori negativi |
| `muted` | `#6b7280` | Label, testo secondario |

### Classi custom in `globals.css`

| Classe | Descrizione |
|---|---|
| `.btn-primary` | Bottone principale blu |
| `.btn-secondary` | Bottone outline con bordo primary |
| `.btn-danger` | Bottone rosso per azioni distruttive |
| `.input-field` | Input/select con stile dark |
| `.card` | Container con background-card, bordo, padding, border-radius |
| `.metric-card` | Variante card per le KPI con hover effect |

### Tipografia

Font: **Inter** (Google Fonts), importato in `globals.css`. Peso: 300, 400, 500, 600, 700.

### Responsive

Breakpoint Tailwind standard:
- **Mobile**: 1 colonna per form e card
- **sm (640px)**: 2 colonne per form, link navbar visibili
- **lg (1024px)**: 4 colonne per MetricsCards, layout 3/5 + 2/5 per i grafici

---

## 9. Flussi utente

### Registrazione

```
/ (landing)
  └─► /auth/signup
        ├─ Step 1: SignupForm → POST /auth/signup
        └─ Step 2: ConfirmEmail → POST /auth/confirm
              └─► /auth/login?confirmed=true
                    └─► LoginForm → POST /auth/login
                          └─► /dashboard
```

### Primo accesso

```
/dashboard (ProtectedRoute)
  └── se 0 job → /onboarding
        └── JobForm → POST /jobs
              └─► /dashboard (con dati)
```

### Modifica di un job

```
/dashboard
  └── JobsList: hover riga → bottone Edit visibile
        └── click Edit → form inline nello stesso componente
              └── submit → PUT /jobs/:id
                    └── fetchMetrics() → grafici aggiornati
```

---

## 10. Configurazione e deployment

### Variabili d'ambiente

File `.env.local` (non committato, vedi `.env.local.example`):

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL API Gateway (da `terraform output api_url`) |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | ID User Pool (da `terraform output cognito_pool_id`) |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | ID App Client (da `terraform output cognito_app_client_id`) |
| `NEXT_PUBLIC_COGNITO_REGION` | `eu-west-1` |

Le variabili con prefisso `NEXT_PUBLIC_` sono esposte al browser (bundle JavaScript). Non contengono segreti — sono tutti ID pubblici.

### Deployment su Vercel

```bash
cd frontend
npm install
npm run build       # verifica che non ci siano errori TypeScript

npx vercel --prod   # primo deploy (chiede nome progetto, team, ecc.)
```

In Vercel Dashboard → Settings → Environment Variables: aggiungere le stesse 4 variabili di `.env.local`.

Ogni push su `main` triggera un re-deploy automatico (integrazione GitHub).

### Sviluppo locale

```bash
make frontend-install   # npm install
make frontend-dev       # next dev → http://localhost:3000
```

Il frontend in locale parla direttamente con l'API Gateway AWS — non serve nessun server locale per il back end.
