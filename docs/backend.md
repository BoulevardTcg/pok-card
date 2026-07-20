# Backend Documentation — server/

**Generated:** 2026-03-15
**Part type:** backend
**Directory:** `server/`
**Port:** 8080

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | >=24.0.0 | Runtime |
| Express | 4.19.2 | HTTP framework |
| TypeScript | 5.4.0 | Type safety |
| Prisma | 6.15.0 | ORM |
| PostgreSQL | 17 | Database |
| Stripe | 14.24.0 | Payment processing |
| jsonwebtoken | 9.0.2 | JWT (RS256) |
| bcryptjs | 2.4.3 | Password hashing |
| OTPAuth | 9.4.1 | 2FA / TOTP |
| Winston | 3.19.0 | Logging with daily rotation |
| Nodemailer | 7.0.11 | Email (SMTP) |
| Resend | 6.7.0 | Email (transactional API) |
| Helmet | 8.0.0 | Security headers |
| CORS | 2.8.5 | Cross-origin requests |
| express-rate-limit | 7.3.0 | Rate limiting |
| Zod | 4.3.5 | Schema validation |
| express-validator | - | Request validation |
| Multer | 2.0.2 | File uploads |
| TCGdex SDK | 2.7.0 | Card data & pricing |
| Swagger | 6.2.8 | OpenAPI documentation |
| Vitest | 4.0.16 | Unit/integration testing |

---

## Directory Structure

```
server/src/
├── routes/             # API route handlers (14 files)
├── middleware/         # Express middleware (2 files)
├── services/           # Business logic services (1 file)
├── config/             # App configuration (4 files)
├── utils/              # Helper utilities (5 files)
├── validators/         # Zod/express-validator schemas (1 file)
├── pricing/            # TCGdex pricing integration (2 files)
├── lib/                # Shared singletons (1 file)
├── __tests__/          # Test files (20 files)
├── app.ts              # Express app setup & route mounting
├── index.ts            # Server entry point (port binding)
└── swagger.ts          # OpenAPI spec generation
```

---

## Routes

| File | Mount | LOC | Key Endpoints |
|------|-------|-----|---------------|
| `admin.ts` | `/api/admin` | 1729 | Orders, products, users, stats |
| `checkout.ts` | `/api/checkout` | 1102 | Stripe session, webhook |
| `auth.ts` | `/api/auth` | 614 | Login, register, refresh, logout, 2FA |
| `gdpr.ts` | `/api/gdpr` | ~500 | Consent, export, deletion requests |
| `users.ts` | `/api/users` | ~450 | Profile, collection, favorites |
| `trade-offers.ts` | `/api/trade` | ~320 | Offers CRUD, accept/reject |
| `reviews.ts` | `/api/reviews` | ~270 | Product reviews CRUD |
| `twoFactor.ts` | `/api/2fa` | ~250 | TOTP setup, enable/disable |
| `products.ts` | `/api/products` | ~250 | Catalogue, search, pricing |
| `collection.ts` | `/api/collection` | ~200 | User card collection |
| `promo.ts` | `/api/promo` | ~150 | Promo code validation |
| `contact.ts` | `/api/contact` | ~120 | Contact form + honeypot |
| `orders.ts` | `/api/orders` | ~90 | User order history |
| `checkout-simple.ts` | `/api/checkout-simple` | ~120 | Legacy checkout (deprecated) |

---

## Middleware

### `middleware/auth.ts`
- `authenticateToken(req, res, next)` — Verifies JWT, attaches `req.user`
- `requireAdmin(req, res, next)` — Admin role guard
- `optionalAuth(req, res, next)` — Attaches user if token present, continues either way

### `middleware/security.ts`
- Helmet (HTTP security headers)
- CORS whitelist (frontend URL)
- General rate limiter: 100 req/15min per IP
- Auth rate limiter: 10 req/15min per IP
- 2FA rate limiter: 5 attempts/15min per email
- Cookie parser with signed cookies

---

## Configuration

### `config/validateEnv.ts`
Zod schema validating all required environment variables at startup. Fails fast if misconfigured.

### `config/security.ts`
Helmet options, CORS whitelist, rate limiter configurations.

### `config/stripe.ts`
Stripe SDK initialization with secret key.

### `config/shipping.ts`
Shipping methods constants (Colissimo, Mondial Relay, Chronopost, UPS, DHL, FedEx) with pricing tiers.

---

## Services

### `services/email.ts`
- Dual provider: Nodemailer (SMTP) + Resend (transactional)
- HTML email templates for:
  - Order confirmation
  - Shipping notification with tracking link
  - Password reset
  - Stock notification
  - Contact form acknowledgment

---

## Utilities

| File | Purpose |
|------|---------|
| `utils/auth.ts` | JWT generation (access + refresh), token rotation |
| `utils/logger.ts` | Winston instance, daily log rotation |
| `utils/audit.ts` | Audit event logging (sensitive operations) |
| `utils/tracking.ts` | Order tracking link generation/verification (HMAC) |
| `utils/date.ts` | Date formatting helpers |
| `lib/prisma.ts` | Prisma Client singleton with exponential retry |

---

## Authentication Flow

```
POST /api/auth/login
  → Validate credentials
  → Generate accessToken (RS256, 15min)
  → Generate refreshToken (RS256, 7d)
  → Store refreshToken in DB (RefreshToken model)
  → Set refreshToken in httpOnly cookie (path: /api/auth)
  → Return { accessToken, user }

POST /api/auth/refresh
  → Read cookie refreshToken (fallback: body for Marketplace)
  → Verify token in DB
  → Rotate: delete old, issue new
  → Return { accessToken }

POST /api/auth/logout
  → Delete refreshToken from DB
  → Clear cookie
```

---

## Checkout Flow

```
1. POST /api/checkout/create-session
   → Validate cart items (prices from DB, not client)
   → Apply promo code if provided (atomic usedCount increment)
   → Create Stripe Checkout session
   → Return { sessionUrl }

2. Stripe redirects user to payment

3. POST /api/checkout/webhook (Stripe event)
   → Verify Stripe signature
   → On checkout.session.completed:
     → Transaction: check stripeSessionId uniqueness (P2002 = duplicate)
     → Create Order + OrderItems + OrderEvents
     → Update ProductVariant stock
     → Send confirmation email
```

---

## Pricing Integration

### `pricing/normalizeTcgdexPricing.ts`
- Fetches card prices from TCGdex API (CardMarket, TCGPlayer)
- Normalizes price data to internal format

### `pricing/snapshotTcgdexPricing.ts`
- Captures price snapshots to `CardPriceSnapshot` model
- Enables price trend visualization

---

## Testing

**Framework:** Vitest 4.0.16

**Test database:** PostgreSQL on port 5434 (separate from dev)

```bash
npm --prefix server test                              # Run all tests
npm --prefix server run test:watch                    # Watch mode
npm --prefix server run test:coverage                 # Coverage report
npm --prefix server test -- src/__tests__/auth.test.ts  # Single file
```

**Test files (24) — 376 test cases total:**

| File | Coverage area |
|------|--------------|
| `auth.test.ts` | Auth routes (login, register, refresh) |
| `middleware-auth.test.ts` | JWT middleware |
| `checkout.test.ts` | Stripe session, webhook idempotence |
| `admin-orders.test.ts` | Admin order management |
| `products.test.ts` | Product catalogue |
| `collection.test.ts` | User collections |
| `orders.test.ts` | Order history |
| `trade-cards.test.ts` | Trade card search & details |
| `routes-reviews.test.ts` | Reviews CRUD |
| `routes-promo.test.ts` | Promo code logic |
| `routes-gdpr.test.ts` | GDPR endpoints |
| `routes-twoFactor.test.ts` | 2FA setup |
| `routes-users.test.ts` | User profile |
| `security.test.ts` | Security middleware |
| `security-extended.test.ts` | Extended security tests |
| `email-templates.test.ts` | Email rendering |
| `config.test.ts` | Config validation |
| `tracking.test.ts` | Tracking HMAC |
| `utils-audit.test.ts` | Audit logging utility |
| `utils-auth.test.ts` | JWT generation & token helpers |
| `utils-date.test.ts` | Date utilities |
| `validators.test.ts` | Zod/express-validator schemas |
| `normalizeTcgdexPricing.test.ts` | Pricing normalization |
| `snapshot.test.ts` | Price snapshots |

---

## Logging

**Winston configuration:**
- `logs/app-YYYY-MM-DD.log` — All application logs
- `logs/error-YYYY-MM-DD.log` — Errors only
- `logs/audit-YYYY-MM-DD.log` — Audit trail (sensitive operations)
- Console output in development

**Audit events logged:** Login attempts, password changes, 2FA changes, order creation, admin operations, GDPR requests.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_PRIVATE_KEY` | RS256 private key (PEM) | Yes |
| `JWT_PUBLIC_KEY` | RS256 public key (PEM) | Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Yes |
| `SMTP_HOST` | Email SMTP host | Yes |
| `SMTP_PORT` | Email SMTP port | Yes |
| `SMTP_USER` | Email SMTP user | Yes |
| `SMTP_PASS` | Email SMTP password | Yes |
| `ORDER_TRACKING_SECRET` | HMAC secret for tracking links | Yes |
| `FRONTEND_PUBLIC_URL` | Frontend URL (for emails, redirects) | Yes |
| `NODE_ENV` | `production` or `development` | Yes |
| `ENABLE_SWAGGER` | Enable Swagger UI at `/api-docs` | No |

---

## API Documentation

Swagger UI available at `http://localhost:8080/api-docs` when `ENABLE_SWAGGER=true`.

Spec generated in `server/src/swagger.ts`.

---

## Database Commands

```bash
# Generate Prisma client (after schema changes)
npx --prefix server prisma generate

# Create migration
npm --prefix server run db:migrate

# Deploy migrations (production)
npm --prefix server run db:migrate:deploy

# Seed database
npm --prefix server run seed
```
