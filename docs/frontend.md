# Frontend Documentation — pokecard/

**Generated:** 2026-03-15
**Part type:** web
**Directory:** `pokecard/`
**Dev port:** 5173

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI framework |
| React Router | 7.6.2 | Client-side routing |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool & dev server |
| Three.js | 0.179.1 | 3D card rendering |
| React Three Fiber | 9.3.0 | Three.js React bindings |
| @paper-design/shaders-react | 0.0.69 | Holographic shader effects |
| Framer Motion | 12.12.2 | Animations |
| Stripe.js | 2.4.0 | Payment integration |
| Lucide React | latest | Icon library |
| ESLint | 9.29 | Linting |
| Prettier | 3.7.4 | Code formatting |

---

## Directory Structure

```
pokecard/src/
├── pages/                  # Route-level page components (22)
├── components/             # Reusable UI components (71)
│   ├── admin/              # Admin layout
│   ├── catalogue/          # Product catalogue components (6)
│   ├── icons/              # SVG icon components (3)
│   ├── landing/            # Landing page sections (16)
│   ├── navbar/             # Navigation (1)
│   └── ui/                 # Generic UI primitives (2)
│   └── (shared)            # Cross-cutting components (12)
├── contexts/               # React Context providers (3)
├── hooks/                  # Custom hooks (2)
├── utils/                  # Utility functions (3)
├── styles/                 # Global styles & design tokens
├── pokeholo-css/           # Card holographic CSS library
├── assets/                 # Static assets
├── theme/                  # Theme configuration
├── api.ts                  # Centralized API client
├── authContext.tsx          # Auth state & token management
├── cartContext.tsx          # Shopping cart state
├── foilMap.ts              # Card foil mapping
└── shippingMethods.ts      # Shipping method constants
```

---

## Pages (22)

| Page | Route (inferred) | Purpose |
|------|-----------------|---------|
| Home | `/` | Landing page |
| LoginPage | `/login` | User authentication |
| RegisterPage | `/register` | User registration |
| ForgotPasswordPage | `/forgot-password` | Password reset request |
| ResetPasswordPage | `/reset-password` | Password reset form |
| ProductsPage | `/products` | Product catalogue |
| ProductDetail | `/products/:id` | Single product view |
| CardsPage | `/cards` | Pokémon cards catalogue |
| AccessoiresPage | `/accessories` | Accessories catalogue |
| ProtectionsPage | `/protections` | Card protections catalogue |
| CategorySpecificPage | `/category/:slug` | Category-filtered products |
| CartPage | `/cart` | Shopping cart |
| CheckoutSuccess | `/checkout/success` | Post-payment confirmation |
| OrdersPage | `/orders` | User order history |
| OrderDetailPage | `/orders/:id` | Order details |
| OrderTrackingPage | `/tracking` | Order tracking |
| TradePage | `/trade` | P2P trade marketplace |
| TradeSetPage | `/trade/set` | Create trade offer |
| UserProfile | `/profile` | User account settings |
| HoloCard | `/holo` | 3D card demo/viewer |
| Concours | `/concours` | Contest page |
| ContactPage | `/contact` | Contact form |
| AdminOrdersPage | `/admin/orders` | Admin order management |
| NewsPage | `/news` | News/blog |

---

## Contexts

### AuthContext (`authContext.tsx`)
- Stores `user` and `accessToken` in state
- `accessToken` in `localStorage` (15min expiry)
- Refresh token in httpOnly cookie — **never** in localStorage or JSON response
- `credentials: 'include'` on `/api/auth/refresh` and `/api/auth/logout`
- Auto-refresh before expiry

### CartContext (`cartContext.tsx`)
- Client-side cart state
- Items: `{ product, variant, quantity }`
- Persisted in localStorage

### DarkModeContext (`contexts/`)
- User theme preference
- Persisted in localStorage

---

## Key Components

### Catalogue
| Component | Purpose |
|-----------|---------|
| `ProductCard` | Product card with image, price, add-to-cart |
| `ProductGrid` | Grid layout with virtualization |
| `ProductListItem` | List layout variant |
| `FilterBar` | Top filter controls |
| `FilterSidebar` | Sidebar filters (category, price, etc.) |
| `ViewToggle` | Grid/list view switcher |

### Landing (16 sections)
Hero, Benefits, FAQ, and 13 other landing page sections for the home page.

### Shared
| Component | Purpose |
|-----------|---------|
| `ProtectedRoute` | Redirects unauthenticated users |
| `AdminRoute` | Admin-only route guard |
| `ErrorBoundary` | React error boundary |
| `CheckoutAuth` | Auth gate for checkout flow |
| `CheckoutButton` | Stripe checkout trigger |
| `NavDropdown` | Navbar dropdown menu |
| `NotifyModal` | Back-in-stock notification signup |
| `ScrollProtectedCard` | Wraps 3D card during scroll |
| `TwoFactorSettings` | 2FA management UI |

---

## API Client (`api.ts`)
- Centralized axios/fetch wrapper
- Injects `Authorization: Bearer <token>` on authenticated requests
- Handles 401 → auto-refresh token flow
- Base URL from `import.meta.env.VITE_API_URL`

---

## 3D Card System

The holographic card effect uses:
- **Three.js + React Three Fiber** for 3D rendering
- **@paper-design/shaders-react** for holographic shaders
- **pokeholo-css/** — CSS library for card foil effects
- **foilMap.ts** — Maps card IDs to foil textures
- **ScrollProtectedCard** — Pauses 3D rendering during scroll for performance

---

## State Management

No external state library (Redux/Zustand). Uses:
1. React Context API for global state (auth, cart, dark mode)
2. Local component state (`useState`, `useReducer`) for UI state
3. `localStorage` for persistence (token, cart, preferences)

---

## Routing

React Router v7 with:
- `ProtectedRoute` wrapper for authenticated pages
- `AdminRoute` wrapper for admin pages
- Client-side navigation (SPA)

---

## Build & Dev

```bash
# Development (hot reload, port 5173)
npm --prefix pokecard run dev

# Production build
npm --prefix pokecard run build

# Lint
npm --prefix pokecard run lint
```

**Vite config:** `pokecard/vite.config.ts`
- API proxy to backend in development
- TypeScript path aliases

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | Yes |

---

## Key Utilities

| File | Purpose |
|------|---------|
| `utils/filters.ts` | Product filtering logic |
| `utils/productMatching.ts` | Product search/match helpers |
| `utils/security.ts` | Input sanitization helpers |
| `shippingMethods.ts` | Shipping option constants (mirrors server config) |
| `foilMap.ts` | Card ID → foil texture mapping |
