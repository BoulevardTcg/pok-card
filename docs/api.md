# API Reference — BoulevardTCG

**Generated:** 2026-03-15
**Base URL (dev):** `http://localhost:8080/api`
**Swagger UI:** `http://localhost:8080/api-docs` (requires `ENABLE_SWAGGER=true`)

---

## Response Format

```typescript
// Success
{ data: T, meta?: { page: number, total: number, limit: number } }

// Exceptions (auth routes)
{ accessToken: string, user: object, message: string }

// Error
{ error: { code: string, message: string, details?: any } }
```

---

## Authentication

All protected routes require:
```
Authorization: Bearer <accessToken>
```

Admin routes additionally require `user.role === 'admin'`.

---

## Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | — | Create account |
| POST | `/login` | — | Login, returns accessToken + sets refresh cookie |
| POST | `/refresh` | Cookie/Body | Rotate refresh token, returns new accessToken |
| POST | `/logout` | Cookie | Invalidate refresh token |
| POST | `/forgot-password` | — | Send password reset email |
| POST | `/reset-password` | — | Reset password with token |

### POST `/api/auth/login`
```json
// Request
{ "email": "string", "password": "string", "totpCode": "string?" }

// Response
{ "accessToken": "string", "user": { "id", "email", "role", "twoFactorEnabled" } }
```

### POST `/api/auth/refresh`
- Reads `refreshToken` cookie (path `/api/auth`)
- Fallback: reads `refreshToken` from request body (Marketplace compatibility)

---

## Products Routes — `/api/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | — | List products (paginated, filterable) |
| GET | `/:id` | — | Get product by ID |
| GET | `/search` | — | Search products |
| GET | `/categories` | — | List categories |

### GET `/api/products`
**Query params:** `page`, `limit`, `category`, `search`, `minPrice`, `maxPrice`, `inStock`

---

## Checkout Routes — `/api/checkout`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-session` | Optional | Create Stripe Checkout session |
| POST | `/webhook` | Stripe sig | Stripe event handler (order creation) |

### POST `/api/checkout/create-session`
```json
// Request
{
  "items": [{ "variantId": "string", "quantity": number }],
  "promoCode": "string?",
  "shippingMethod": "string"
}

// Response
{ "data": { "sessionUrl": "string" } }
```

---

## Orders Routes — `/api/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Required | User's order history (paginated) |
| GET | `/:id` | Required | Order details |
| GET | `/track/:token` | — | Public order tracking via HMAC token |

---

## Trade Routes — `/api/trade`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Required | List trade offers for user |
| POST | `/` | Required | Create trade offer |
| GET | `/:id` | Required | Get trade offer details |
| PATCH | `/:id/accept` | Required | Accept trade offer |
| PATCH | `/:id/reject` | Required | Reject trade offer |
| DELETE | `/:id` | Required | Cancel trade offer |
| GET | `/cards/search` | Required | Search cards for trading |
| GET | `/cards/:id` | Required | Get card details |

---

## Reviews Routes — `/api/reviews`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/product/:productId` | — | Product reviews (paginated) |
| POST | `/product/:productId` | Required | Submit review |
| PATCH | `/:id` | Required | Edit own review |
| DELETE | `/:id` | Required | Delete own review |

---

## Users Routes — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me` | Required | Current user profile |
| PATCH | `/me` | Required | Update profile |
| GET | `/me/collection` | Required | User card collection |
| POST | `/me/collection` | Required | Add card to collection |
| DELETE | `/me/collection/:id` | Required | Remove from collection |
| GET | `/me/favorites` | Required | Saved favorites |
| POST | `/me/favorites` | Required | Add favorite |
| DELETE | `/me/favorites/:id` | Required | Remove favorite |

---

## 2FA Routes — `/api/2fa`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/setup` | Required | Generate TOTP secret + QR code |
| POST | `/verify` | Required | Verify TOTP code to enable 2FA |
| POST | `/disable` | Required | Disable 2FA |

---

## Promo Routes — `/api/promo`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/validate` | — | Validate promo code |

---

## Contact Routes — `/api/contact`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/` | — | Send contact message (honeypot protected) |

---

## GDPR Routes — `/api/gdpr`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/consent` | Required | Get consent status |
| POST | `/consent` | Required | Update marketing consent |
| POST | `/export` | Required | Request data export |
| POST | `/delete` | Required | Request account deletion |

---

## Admin Routes — `/api/admin`

> All admin routes require `role === 'admin'`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | List all orders (paginated, filterable) |
| GET | `/orders/:id` | Order details |
| PATCH | `/orders/:id` | Update order (status, tracking, carrier) |
| GET | `/products` | List all products |
| POST | `/products` | Create product |
| PATCH | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| POST | `/products/:id/images` | Upload product images |
| GET | `/variants/:id` | Get variant |
| PATCH | `/variants/:id` | Update variant (stock, price) |
| GET | `/users` | List users |
| GET | `/users/:id` | User details |
| PATCH | `/users/:id` | Update user (role, status) |
| GET | `/stats` | Dashboard statistics |
| GET | `/promo-codes` | List promo codes |
| POST | `/promo-codes` | Create promo code |
| PATCH | `/promo-codes/:id` | Update promo code |
| DELETE | `/promo-codes/:id` | Delete promo code |
| GET | `/stock-notifications` | Back-in-stock subscriber list |

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid token |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request body validation failed |
| `DUPLICATE` | Unique constraint violation |
| `RATE_LIMITED` | Too many requests |
| `STRIPE_ERROR` | Stripe API error |
| `EMAIL_ERROR` | Email send failure |
