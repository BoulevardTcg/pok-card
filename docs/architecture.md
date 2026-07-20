# Architecture Overview — BoulevardTCG

**Generated:** 2026-03-15
**Scan level:** Deep
**Project type:** Monorepo (multi-part: web + backend)

---

## Project Classification

BoulevardTCG is a **TCG (Trading Card Game) e-commerce platform** built as a modular monolith, structured as a monorepo without npm workspaces. It includes a React frontend (`pokecard/`) and an Express/Prisma backend (`server/`), designed for future microservices extraction.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
│              React 19 + Vite (port 5173/3000)           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS BACKEND (port 8080)                 │
│         Node.js 24 + TypeScript + Prisma ORM            │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma Client
                       ▼
┌─────────────────────────────────────────────────────────┐
│                POSTGRESQL 17 (port 5434)                 │
│               Docker volume: ./postgres-data            │
└─────────────────────────────────────────────────────────┘

External Services:
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Stripe  │  │  Email   │  │  TCGdex  │  │  Swagger │
  │ Payments │  │ SMTP/    │  │  Card    │  │   Docs   │
  │ Webhooks │  │ Resend   │  │  Prices  │  │ /api-docs│
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## Parts

| Part | Directory | Type | Technology |
|------|-----------|------|------------|
| Frontend | `pokecard/` | web | React 19 + TypeScript + Vite |
| Backend | `server/` | backend | Express + TypeScript + Prisma |

---

## Key Architectural Decisions

### 1. Monorepo Without Workspaces
- Scripts run via `npm --prefix <dir>`
- No hoisted dependencies — each part manages its own `node_modules`
- Root `package.json` provides convenience scripts (`dev:front`, `dev:back`)

### 2. JWT with RS256 Asymmetric Signing
- Private key signs tokens (backend only)
- Public key verifies tokens (can be distributed to microservices)
- Keys stored in `server/keys/` (git-ignored)
- Access token: 15min, stored in `localStorage`
- Refresh token: 7d, httpOnly cookie at `/api/auth`

### 3. Stripe Checkout with Webhook-based Order Creation
- No server-side cart state — Stripe session holds line items
- Orders created only on successful `checkout.session.completed` webhook
- `stripeSessionId @unique` prevents duplicate orders (idempotence)

### 4. Prisma as ORM with Migration-based Schema Evolution
- 9 migrations since December 2024
- Connection pooling support via PgBouncer URL format
- Singleton pattern in `server/src/lib/prisma.ts` with retry logic

### 5. Write-as-you-go Logging
- Winston with daily rotation
- Structured JSON logs in `server/logs/`
- Separate audit trail for sensitive operations

---

## Request Lifecycle

```
Request → Nginx (prod) / Vite proxy (dev)
        → Express
        → security.ts middleware (Helmet, CORS, rate limiting)
        → auth.ts middleware (JWT verification, optional)
        → Route handler
        → Prisma ORM
        → PostgreSQL
        → Response { data: T } or { error: { code, message } }
```

---

## Multi-Part Integration

- Frontend calls backend via `VITE_API_URL` (build-time env injection)
- No shared TypeScript types package — types duplicated where needed
- Cookie cross-origin handled via `credentials: 'include'` on relevant requests

---

## Deployment Architecture

```
Internet → Caddy (TLS termination, reverse proxy)
         → Docker network
         ├── pokecard-frontend (Nginx, port 3000)
         └── pokecard-backend (Node.js, port 8080)
                └── PostgreSQL (port 5434, internal)
```

- `deployment/Caddyfile` — production TLS/proxy config
- `deployment/e2e-smoke.mjs` — smoke test after deploy
- `docker-compose.production.example.env` — production env template
