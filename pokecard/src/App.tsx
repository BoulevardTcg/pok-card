import { useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './Home';
import styles from './App.module.css';
import NavbarGlass from './components/navbar/NavbarGlass';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AuthProvider } from './authContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Routes chargées à la demande (code-splitting) pour alléger le bundle initial.
// Les pages publiques secondaires, le compte, l'admin et les libs lourdes (Three.js
// via ProductDetail/Trade) ne sont téléchargées que lorsqu'elles sont visitées.
const Concours = lazy(() => import('./Concours').then((m) => ({ default: m.Concours })));
const ProductDetail = lazy(() =>
  import('./ProductDetail').then((m) => ({ default: m.ProductDetail }))
);
const CartPage = lazy(() => import('./CartPage').then((m) => ({ default: m.CartPage })));
const CardsPage = lazy(() => import('./CardsPage').then((m) => ({ default: m.CardsPage })));
const ProductsPage = lazy(() =>
  import('./ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const CategorySpecificPage = lazy(() =>
  import('./CategorySpecificPage').then((m) => ({ default: m.CategorySpecificPage }))
);
const AccessoiresPage = lazy(() =>
  import('./AccessoiresPage').then((m) => ({ default: m.AccessoiresPage }))
);
const ProtectionsPage = lazy(() =>
  import('./ProtectionsPage').then((m) => ({ default: m.ProtectionsPage }))
);
const CheckoutSuccess = lazy(() =>
  import('./CheckoutSuccess').then((m) => ({ default: m.CheckoutSuccess }))
);
const TradePage = lazy(() => import('./TradePage').then((m) => ({ default: m.TradePage })));
const TradeSetPage = lazy(() =>
  import('./TradeSetPage').then((m) => ({ default: m.TradeSetPage }))
);
const ContactPage = lazy(() => import('./ContactPage').then((m) => ({ default: m.ContactPage })));
const NewsPage = lazy(() => import('./NewsPage').then((m) => ({ default: m.NewsPage })));
const OrdersPage = lazy(() => import('./OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import('./OrderDetailPage').then((m) => ({ default: m.OrderDetailPage }))
);
const OrderTrackingPage = lazy(() =>
  import('./OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage }))
);
const AdminOrdersPage = lazy(() =>
  import('./AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage }))
);
const LoginPage = lazy(() => import('./LoginPage'));
const RegisterPage = lazy(() => import('./RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./ResetPasswordPage'));
const UserProfile = lazy(() => import('./UserProfile'));
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminUsersPage = lazy(() =>
  import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage }))
);
const AdminInventoryPage = lazy(() =>
  import('./pages/admin/AdminInventoryPage').then((m) => ({ default: m.AdminInventoryPage }))
);
const AdminPromosPage = lazy(() =>
  import('./pages/admin/AdminPromosPage').then((m) => ({ default: m.AdminPromosPage }))
);
const AdminReviewsPage = lazy(() =>
  import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage }))
);
const AdminReportsPage = lazy(() =>
  import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage }))
);
const AdminProductFormPage = lazy(() =>
  import('./pages/admin/AdminProductFormPage').then((m) => ({ default: m.AdminProductFormPage }))
);
const AdminPromoFormPage = lazy(() =>
  import('./pages/admin/AdminPromoFormPage').then((m) => ({ default: m.AdminPromoFormPage }))
);
const CGVPage = lazy(() => import('./pages/legal/CGVPage').then((m) => ({ default: m.CGVPage })));
const MentionsLegalesPage = lazy(() =>
  import('./pages/legal/MentionsLegalesPage').then((m) => ({ default: m.MentionsLegalesPage }))
);
const ConfidentialitePage = lazy(() =>
  import('./pages/legal/ConfidentialitePage').then((m) => ({ default: m.ConfidentialitePage }))
);
const NotFoundPage = lazy(() =>
  import('./NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

// Fallback discret pendant le chargement d'une route.
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', opacity: 0.6 }}
    >
      Chargement…
    </div>
  );
}

// Composant principal de l'application
function AppContent() {
  const location = useLocation();
  const lastScroll = useRef(window.scrollY);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      lastScroll.current = currentScroll;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ne pas afficher la navbar sur la page d'accueil (elle a déjà NavbarGlass dans Home.tsx)
  // Ne pas afficher la navbar sur les pages admin (elles ont leur propre AdminLayout)
  const isHomePage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className={styles.appBg}>
      {/* Lien d'évitement pour l'accessibilité clavier / lecteurs d'écran */}
      <a href="#main-content" className={styles.skipLink}>
        Aller au contenu principal
      </a>

      {/* Navbar Glass pour toutes les pages sauf l'accueil et les pages admin */}
      {!isHomePage && !isAdminPage && <NavbarGlass />}

      <main className={styles.main} id="main-content">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cartes" element={<CardsPage />} />
            <Route path="/accessoires" element={<AccessoiresPage />} />
            <Route path="/accessoires/:category" element={<CategorySpecificPage />} />

            <Route path="/produits" element={<ProductsPage />} />
            <Route path="/produits/:category" element={<CategorySpecificPage />} />
            <Route path="/protections" element={<ProtectionsPage />} />

            <Route path="/concours" element={<Concours />} />
            <Route path="/produit/:slug" element={<ProductDetail />} />
            <Route path="/panier" element={<CartPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/trade/set/:id" element={<TradeSetPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/actualites" element={<NewsPage />} />

            {/* Routes légales */}
            <Route path="/cgv" element={<CGVPage />} />
            <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="/confidentialite" element={<ConfidentialitePage />} />

            {/* Routes d'authentification */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />
            <Route path="/order-tracking/:orderId" element={<OrderTrackingPage />} />

            {/* Routes d'administration */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <AdminProductsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products/new"
              element={
                <AdminRoute>
                  <AdminProductFormPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products/:productId/edit"
              element={
                <AdminRoute>
                  <AdminProductFormPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrdersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <AdminRoute>
                  <AdminInventoryPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/promos"
              element={
                <AdminRoute>
                  <AdminPromosPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/promos/new"
              element={
                <AdminRoute>
                  <AdminPromoFormPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/promos/:promoId/edit"
              element={
                <AdminRoute>
                  <AdminPromoFormPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reviews"
              element={
                <AdminRoute>
                  <AdminReviewsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReportsPage />
                </AdminRoute>
              }
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

// Composant racine qui enveloppe l'application avec les providers
export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </DarkModeProvider>
  );
}
