# Deployment Documentation — BoulevardTCG

**Generated:** 2026-03-15

---

## Local Development

### Prerequisites
- Node.js >= 24.0.0
- Docker & Docker Compose
- npm (no yarn/pnpm)

### Quick Start

```bash
# 1. Start PostgreSQL only
docker compose up -d postgres

# 2. Setup backend
cp server/.env.example server/.env
# Edit server/.env with your values
npx --prefix server prisma generate
npm --prefix server run db:migrate
npm --prefix server run seed

# 3. Start services
npm run dev:back    # http://localhost:8080
npm run dev:front   # http://localhost:5173
```

### Full Docker Stack

```bash
# Build and start everything
docker compose up --build

# With Stripe CLI for webhook testing (profile)
docker compose --profile stripe up --build
```

---

## Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `pokecard-frontend` | `./pokecard/Dockerfile` | 3000 | React app via Nginx |
| `pokecard-backend` | `./server/Dockerfile` | 8080 | Express API |
| `postgres` | postgres:17-alpine | 5434 | Database |
| `stripe-cli` | stripe/stripe-cli | — | Webhook forwarding (profile: stripe) |

### Frontend Dockerfile
- Multi-stage: Node build → Nginx serve
- `VITE_API_URL` injected at build time as `--build-arg`
- Nginx config: `pokecard/nginx.conf`

### Backend Dockerfile
- Node.js 24 Alpine
- `entrypoint.sh`: runs migrations then starts server
- RS256 keys injected via environment variables

---

## Production Deployment

### Infrastructure

```
Internet
   ↓ HTTPS
Caddy (TLS termination + reverse proxy)
   ↓
Docker network
   ├── pokecard-frontend (Nginx, port 3000)
   └── pokecard-backend (Node.js, port 8080)
          └── PostgreSQL (port 5434)
```

### Caddy Configuration
`deployment/Caddyfile` — handles:
- TLS certificate auto-provisioning (Let's Encrypt)
- Reverse proxy to frontend/backend
- HTTP → HTTPS redirect

### Production Environment

Copy `docker-compose.production.example.env` and fill:
```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/boulevardtcg

# JWT Keys (RS256) — inline PEM
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=...

# App
FRONTEND_PUBLIC_URL=https://boulevardtcg.com
ORDER_TRACKING_SECRET=<64 char random string>
NODE_ENV=production
```

---

## CI/CD

**GitHub Actions:** `.github/workflows/ci.yml`

Pipeline runs on push/PR:
1. Install dependencies (frontend + backend)
2. Lint (ESLint)
3. Type check (TypeScript)
4. Tests (Vitest)

---

## Post-Deploy Verification

```bash
# Smoke tests
node deployment/e2e-smoke.mjs https://your-domain.com
```

Smoke test checks:
- API health endpoint
- Frontend loads
- Key routes respond

---

## Database Migrations in Production

```bash
# Deploy pending migrations (no interactive prompts)
npm --prefix server run db:migrate:deploy
```

The backend `entrypoint.sh` runs this automatically on container start.

---

## Monitoring

- **Logs:** Winston daily rotation in `server/logs/`
- **Errors:** `logs/error-YYYY-MM-DD.log`
- **Audit:** `logs/audit-YYYY-MM-DD.log`
- **Swagger:** `https://api.domain.com/api-docs` (if `ENABLE_SWAGGER=true`)

---

## Generating JWT Keys (RS256)

```bash
# Generate keys
openssl genrsa -out server/keys/jwt_private.pem 2048
openssl rsa -in server/keys/jwt_private.pem -pubout -out server/keys/jwt_public.pem

# For Docker: inline as env var
JWT_PRIVATE_KEY=$(cat server/keys/jwt_private.pem | tr '\n' '\\n')
JWT_PUBLIC_KEY=$(cat server/keys/jwt_public.pem | tr '\n' '\\n')
```
