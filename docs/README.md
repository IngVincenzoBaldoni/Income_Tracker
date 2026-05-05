# Documentation

Documentazione funzionale e architetturale del progetto **Career Income Tracker**.

---

## Indice

| File | Contenuto |
|---|---|
| [backend.md](./backend.md) | Architettura back end — AWS, Lambda, RDS, Cognito, API Gateway |
| [frontend.md](./frontend.md) | Architettura front end — Next.js, componenti, hooks, utilities |

---

## Panoramica del sistema

```
┌──────────────┐     HTTPS      ┌─────────────────────┐
│   Browser    │ ─────────────► │   API Gateway (AWS) │
│ (Next.js on  │                │   REST + CORS        │
│   Vercel)    │ ◄───────────── └──────────┬──────────┘
└──────────────┘                           │  Lambda Proxy
                                           ▼
                              ┌────────────────────────┐
                              │   Lambda Functions     │
                              │   (Node.js 18.x)       │
                              └────────┬───────┬───────┘
                                       │       │
                              ┌────────▼──┐ ┌──▼──────────┐
                              │ RDS        │ │  Cognito    │
                              │ PostgreSQL │ │  User Pool  │
                              └───────────┘ └─────────────┘
```
