# Security Documentation — BoulevardTCG

**Generated:** 2026-03-15
**Last audit:** fix/audit-p1 (2026-03-15)

---

## Security Layers

### HTTP Layer (Helmet)
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Content-Security-Policy
- Referrer-Policy

### CORS
- Whitelist: `FRONTEND_PUBLIC_URL` only
- `credentials: true` (cookies)
- Specific allowed methods/headers

### Rate Limiting
| Limiter | Limit | Window | Applied to |
|---------|-------|--------|-----------|
| General | 100 req | 15 min | All `/api/*` |
| Auth | 10 req | 15 min | `/api/auth/*` |
| 2FA | 5 req | 15 min | `/api/auth/2fa` (per email) |

---

## Authentication Security

### JWT (RS256 asymmetric)
- Private key signs tokens — stored in `server/keys/jwt_private.pem` (git-ignored)
- Public key verifies — can be distributed to microservices
- Access token: 15min expiry, `localStorage`
- Refresh token: 7d expiry, httpOnly cookie (`path: /api/auth`, `SameSite: Strict`)

### Refresh Token Security
- Stored hashed in DB (`RefreshToken` model)
- Rotated on each use (old invalidated, new issued)
- **Never** sent in JSON response body (except Marketplace fallback via body)
- **Never** stored in `localStorage` on frontend

### 2FA (TOTP)
- OTPAuth library, TOTP standard
- Setup requires verification before activation
- 5 attempts / 15 min rate limit (prevents brute-force)
- Secret stored encrypted in `User.twoFactorSecret`

---

## Payment Security

### Stripe
- All prices validated server-side (client sends `variantId`, not price)
- Webhook signature verified via `STRIPE_WEBHOOK_SECRET`
- Order creation in DB transaction with `stripeSessionId @unique`
- P2002 (duplicate key) caught → idempotent: no duplicate orders

---

## Promo Code Security

- `usedCount` incremented atomically: `updateMany({ where: { id, usedCount: { lt: usageLimit } } })`
- Prevents over-redemption under concurrent requests
- Expiry date checked server-side

---

## Password Security

- bcrypt hashing (cost factor: default 10+)
- Password reset tokens: time-limited, single-use (`PasswordResetToken` model)
- Reset link sent via email only

---

## Contact Form

- Honeypot field to catch bots
- Rate limited
- Input sanitized

---

## GDPR Compliance

- Marketing consent tracked with timestamp (`marketingConsent`, `marketingConsentDate`)
- Data export endpoint (`POST /api/gdpr/export`)
- Account deletion request (`POST /api/gdpr/delete`) → `deletionRequestedAt` set, processed by admin
- Cascade deletes on User removal

---

## Audit Logging

All sensitive operations are logged to `logs/audit-YYYY-MM-DD.log`:
- Login attempts (success/failure)
- Password changes
- 2FA enable/disable
- Order creation
- Admin operations
- GDPR requests

---

## Security Roadmap

See `BACKEND_SECURITY_ROADMAP.md` for planned improvements.

**Completed (fix/audit-p0, fix/audit-p1):**
- C1: Removed localStorage refreshToken on frontend
- H1: 2FA rate limiting
- H3: Atomic promo code increment
- H4: Stripe webhook idempotence
- Prisma singleton (prevent connection exhaustion)
- Error logging with tracking
- DB performance indexes

---

## Security Checklist for New Features

- [ ] All user input validated (express-validator or Zod)
- [ ] Prices/amounts always read from DB, never trusted from client
- [ ] New admin routes use `requireAdmin` middleware
- [ ] New auth routes have appropriate rate limits
- [ ] Sensitive operations logged via `utils/audit.ts`
- [ ] File uploads (Multer) have type/size restrictions
- [ ] No secrets in logs (passwords, tokens, keys)
