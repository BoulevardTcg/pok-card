# BoulevardTCG — Documentation Index

**Generated:** 2026-03-15
**Scan level:** Deep
**Project:** pok-card
**Parts:** Frontend (`pokecard/`), Backend (`server/`)

---

## Quick Reference

| Topic | File | Description |
|-------|------|-------------|
| Architecture | [architecture.md](./architecture.md) | System design, deployment, key decisions |
| Frontend | [frontend.md](./frontend.md) | React app, components, contexts, routing |
| Backend | [backend.md](./backend.md) | Express API, middleware, services, tests |
| Database | [database.md](./database.md) | Prisma schema, models, migrations |
| API Reference | [api.md](./api.md) | All endpoints, request/response format |
| Security | [security.md](./security.md) | Auth, rate limiting, GDPR, audit log |
| Deployment | [deployment.md](./deployment.md) | Docker, production setup, CI/CD |

---

## Project Summary

**BoulevardTCG** is a TCG e-commerce platform with shop, marketplace, and trading features.

- **Frontend:** React 19 + TypeScript + Vite — 22 pages, 71 components, holographic 3D card effects
- **Backend:** Express + TypeScript + Prisma — 14 route modules, 20 test files
- **Database:** PostgreSQL 17 — 19 models, 9 migrations
- **Payments:** Stripe Checkout with idempotent webhook-based order creation
- **Auth:** JWT RS256 + optional 2FA (TOTP)
- **Node version:** >= 24.0.0

---

## Development Quick Start

```bash
# Start PostgreSQL
docker compose up -d postgres

# Backend (port 8080)
npm --prefix server run dev

# Frontend (port 5173)
npm --prefix pokecard run dev

# Run tests
npm --prefix server test
```

---

## Key Workflows

### Checkout
`POST /api/checkout/create-session` → Stripe → Webhook `checkout.session.completed` → Order in DB → Email

### Auth
`POST /api/auth/login` → `{ accessToken }` + refresh cookie → Auto-refresh before expiry

### Order Fulfillment
Admin: `PATCH /api/admin/orders/:id` with carrier + tracking → Shipping email sent

---

## Environment Files

| File | Purpose |
|------|---------|
| `server/.env` | Backend secrets (copy from `server/env.example`) |
| `pokecard/.env` | Frontend build vars (`VITE_API_URL`) |
| `docker-compose.production.example.env` | Production Docker env template |

---

## Additional Docs in Repo

| File | Content |
|------|---------|
| `CLAUDE.md` | Claude Code project instructions |
| `DEV_LOCAL.md` | Local development setup guide |
| `BACKEND_SECURITY_ROADMAP.md` | Security audit roadmap |
| `server/BACKEND_EXPLAINED.md` | Backend architecture details |
| `server/FLUX_DIAGRAMS.md` | Flow diagrams |
| `server/CONTACT_FLOW.md` | Contact form flow |
| `pokecard/FEATURES.md` | Frontend features list |
