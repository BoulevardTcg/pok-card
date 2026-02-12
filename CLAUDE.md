# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoulevardTCG is a TCG e-commerce platform with shop, marketplace, and trading features. Currently a modular monolith (React frontend + Express backend) with PostgreSQL, designed for future microservices extraction.

## Repository Structure

```
pok-card/
├── pokecard/          # Frontend - React 19 + TypeScript + Vite
│   └── src/
│       ├── components/  # UI components (admin, catalogue, icons, landing, navbar, ui)
│       ├── pages/       # Page components
│       ├── contexts/    # React contexts (Auth, Cart, DarkMode)
│       └── hooks/       # Custom React hooks
│
└── server/            # Backend - Express + TypeScript + Prisma
    ├── src/
    │   ├── routes/      # API routes (auth, products, checkout, orders, admin, etc.)
    │   ├── middleware/  # Express middleware (security, auth)
    │   ├── services/    # Business logic (email)
    │   ├── config/      # Configuration (security, shipping, stripe, env validation)
    │   ├── utils/       # Helpers (auth, logger, tracking, audit)
    │   ├── validators/  # Input validation
    │   └── __tests__/   # Vitest tests
    └── prisma/
        └── schema.prisma  # Database models
```

## Common Commands

**Important**: This is a monorepo without workspaces. Never run `npm install` at root level.

### Development
```bash
# Frontend (port 5173)
npm --prefix pokecard run dev

# Backend (port 8080)
npm --prefix server run dev

# Or use root shortcuts
npm run dev:front
npm run dev:back
```

### Testing
```bash
# Run all backend tests
npm --prefix server test

# Watch mode
npm --prefix server run test:watch

# With coverage
npm --prefix server run test:coverage

# Run a single test file
npm --prefix server test -- src/__tests__/auth.test.ts
```

### Linting & Formatting
```bash
# Lint both projects
npm run lint

# Lint and fix both projects
npm run lint:fix

# Format both projects
npm run format
```

### Database (Prisma)
```bash
# Generate Prisma client after schema changes
npx --prefix server prisma generate

# Create migration
npm --prefix server run db:migrate

# Deploy migrations (production)
npm --prefix server run db:migrate:deploy

# Seed database
npm --prefix server run seed
```

### Docker
```bash
# Full stack with PostgreSQL
docker compose up --build

# Just PostgreSQL for local dev
docker compose up -d postgres
```

## Architecture

### Frontend
- **Routing**: React Router v7
- **State**: React Context API (AuthContext, CartContext, DarkModeContext)
- **3D Effects**: Three.js + React Three Fiber (holographic card effects)
- **Build**: Vite with TypeScript

### Backend
- **Auth**: JWT with access + refresh tokens, optional 2FA (TOTP)
- **Payments**: Stripe Checkout with webhook-based order creation
- **Email**: Nodemailer with SMTP, HTML templates
- **Validation**: express-validator + Zod
- **Security**: Helmet, CORS, rate limiting, honeypot on contact form
- **Logging**: Winston with daily rotation

### Database Models (Prisma)
Key models: User, Order, Product, ProductVariant, TradeOffer, UserCollection, PromoCode, ProductReview

### API Response Format
```typescript
// Success
{ data: T, meta?: { page, total, ... } }

// Error
{ error: { code: string, message: string, details?: any } }
```

## Key Workflows

### Checkout Flow
1. Frontend calls `POST /api/checkout/create-session`
2. Backend creates Stripe Checkout session
3. Stripe redirects user to payment
4. Stripe webhook `POST /api/checkout/webhook` triggers order creation
5. Backend persists order and sends confirmation email

### Order Fulfillment
Admin marks order as shipped via `PATCH /api/admin/orders/:id` with carrier and tracking info. Backend sends shipping notification email with tracking link.

## Environment Setup

Backend requires `server/.env` (see `server/env.example`). Critical variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Minimum 64 characters
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SMTP_*` - Email configuration

Frontend uses `VITE_API_URL` for backend connection (build-time injection).

## URLs in Development

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080/api
- Swagger docs: http://localhost:8080/api-docs (when `ENABLE_SWAGGER=true`)
- PostgreSQL: localhost:5432

## Node Version

Both frontend and backend require **Node.js >= 24.0.0**
