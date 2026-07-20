# Database Documentation — PostgreSQL + Prisma

**Generated:** 2026-03-15
**ORM:** Prisma 6.15.0
**Database:** PostgreSQL 17
**Schema:** `server/prisma/schema.prisma`
**Migrations:** 9 (since 2024-12-24)

---

## Models Overview

| Model | Purpose | Key Relations |
|-------|---------|--------------|
| `User` | Core user account | → UserProfile, Order, TradeOffer, RefreshToken, etc. |
| `UserProfile` | Extended user info | ← User (1:1) |
| `Favorite` | Saved cards | ← User |
| `Order` | E-commerce orders | ← User, → OrderItem, OrderEvent |
| `OrderEvent` | Order status history | ← Order |
| `OrderItem` | Line items per order | ← Order, → ProductVariant |
| `Product` | Product catalogue | → ProductVariant, ProductImage, ProductReview |
| `ProductImage` | Product photos | ← Product |
| `ProductVariant` | SKU/pricing/stock | ← Product, → OrderItem |
| `TradeOffer` | P2P trades | ← User (sender/receiver) |
| `ContestTicket` | Contest entries | ← User |
| `RefreshToken` | JWT refresh tokens | ← User |
| `PasswordResetToken` | Password reset | ← User |
| `ProductReview` | Ratings & reviews | ← User, ← Product |
| `PromoCode` | Discount codes | → Order |
| `UserCollection` | Owned cards | ← User |
| `StockNotification` | Back-in-stock alerts | ← User, ← ProductVariant |
| `CardPriceSnapshot` | Market price history | |
| `SaleTransaction` | Internal sales analytics | |

---

## Key Models Detail

### User
```prisma
model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  password              String    // bcrypt hash
  role                  String    @default("user") // "user" | "admin"
  twoFactorEnabled      Boolean   @default(false)
  twoFactorSecret       String?
  marketingConsent      Boolean   @default(false)
  marketingConsentDate  DateTime?
  deletionRequestedAt   DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  // Relations: profile, orders, favorites, refreshTokens, etc.
}
```

### Order
```prisma
model Order {
  id               String      @id @default(cuid())
  userId           String
  status           OrderStatus @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)
  stripeSessionId  String?     @unique  // Webhook idempotence
  total            Decimal
  carrier          Carrier?
  trackingNumber   String?
  shippingAddress  Json        // { name, address, city, zip, country }
  createdAt        DateTime    @default(now())
  // Relations: user, items, events
}
```

### ProductVariant
```prisma
model ProductVariant {
  id            String  @id @default(cuid())
  productId     String
  sku           String  @unique
  price         Decimal
  stock         Int     @default(0)
  stripePriceId String? // Stripe Price object ID
  condition     String? // "NM", "LP", "MP", "HP", "D"
  language      String? // "FR", "EN", "JP", etc.
  // Relations: product, orderItems, stockNotifications
}
```

### PromoCode
```prisma
model PromoCode {
  id           String    @id @default(cuid())
  code         String    @unique
  type         PromoType // PERCENTAGE | FIXED_AMOUNT
  value        Decimal
  usageLimit   Int?
  usedCount    Int       @default(0)
  expiresAt    DateTime?
  active       Boolean   @default(true)
}
```

### CardPriceSnapshot
```prisma
model CardPriceSnapshot {
  id        String      @id @default(cuid())
  cardId    String      // TCGdex card ID
  market    PriceMarket // CARDMARKET | TCGPLAYER
  price     Decimal?
  currency  String
  snappedAt DateTime    @default(now())
  @@index([cardId, market, snappedAt])
}
```

---

## Enums

### OrderStatus
`PENDING` | `CONFIRMED` | `PROCESSING` | `SHIPPED` | `DELIVERED` | `CANCELLED` | `REFUNDED`

### FulfillmentStatus
`UNFULFILLED` | `PARTIAL` | `FULFILLED`

### Carrier
`COLISSIMO` | `MONDIAL_RELAY` | `CHRONOPOST` | `UPS` | `DHL` | `FEDEX`

### OrderEventType
`CREATED` | `CONFIRMED` | `PROCESSING` | `SHIPPED` | `DELIVERED` | `CANCELLED` | `REFUNDED` | `NOTE`

### TradeStatus
`PENDING` | `ACCEPTED` | `REJECTED` | `CANCELLED`

### PromoType
`PERCENTAGE` | `FIXED_AMOUNT`

### PriceMarket
`CARDMARKET` | `TCGPLAYER`

---

## Migrations History

| Migration | Date | Description |
|-----------|------|-------------|
| `20251224143337_init` | 2024-12-24 | Initial schema |
| `20260101192245_add_stock_notifications` | 2026-01-01 | StockNotification model |
| `20260111120000_add_marketing_consent` | 2026-01-11 | GDPR marketing consent fields |
| `20260210120000_add_sale_transaction` | 2026-02-10 | SaleTransaction model |
| `20260216120000_add_card_price_snapshots` | 2026-02-16 | CardPriceSnapshot model |
| `20260311120000_add_stripe_session_id_to_orders` | 2026-03-11 | `Order.stripeSessionId @unique` |
| `20260312000000_add_password_reset_tokens` | 2026-03-12 | PasswordResetToken model |
| `20260313000000_add_indexes_orderitem_tradeoffer` | 2026-03-13 | Performance indexes |

---

## Key Patterns

### Idempotence
- `Order.stripeSessionId @unique` — prevents duplicate orders from repeated Stripe webhooks
- Webhook handler catches `P2002` (unique constraint violation) gracefully

### Atomic Operations
- PromoCode `usedCount` incremented with `updateMany` + `usedCount < usageLimit` condition — prevents over-redemption under concurrent load

### Cascade Deletes
- `User` deletion cascades to all related records (GDPR compliance)

### JSON Fields
- `Order.shippingAddress` — flexible shipping data
- `UserProfile.preferences` — extensible user preferences
- `TradeOffer.offeredCards` / `requestedCards` — card lists as JSON

### Indexes
- `CardPriceSnapshot`: `[cardId, market, snappedAt]`
- `OrderItem`: foreign key indexes for join performance
- `TradeOffer`: status + userId indexes

---

## Prisma Singleton

```typescript
// server/src/lib/prisma.ts
// Single PrismaClient instance with exponential retry on connection failure
// Prevents connection pool exhaustion in serverless/hot-reload scenarios
```

---

## Database Connection

```bash
# Dev (docker)
DATABASE_URL="postgresql://user:pass@localhost:5434/boulevardtcg"

# Production (with PgBouncer)
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/boulevardtcg?pgbouncer=true"
```
