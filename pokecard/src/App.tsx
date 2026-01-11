import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './Home';
import { Concours } from './Concours';
import { ProductDetail } from './ProductDetail';
import { CartPage } from './CartPage';
import { CardsPage } from './CardsPage';
import { ProductsPage } from './ProductsPage';
import { CategorySpecificPage } from './CategorySpecificPage';
import { AccessoiresPage } from './AccessoiresPage';
import { ProtectionsPage } from './ProtectionsPage';
import { CheckoutSuccess } from './CheckoutSuccess';
import styles from './App.module.css';
import { TradePage } from './TradePage';
import { TradeSetPage } from './TradeSetPage';
import { ContactPage } from './ContactPage';
import { NewsPage } from './NewsPage';
import { OrdersPage } from './OrdersPage';
import { OrderDetailPage } from './OrderDetailPage';
import { OrderTrackingPage } from './OrderTrackingPage';
import { AdminOrdersPage } from './AdminOrdersPage';
import { AuthProvider } from './authContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import UserProfile from './UserProfile';
import NavbarGlass from './components/navbar/NavbarGlass';
import { DarkModeProvider } from './contexts/DarkModeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminPromosPage } from './pages/admin/AdminPromosPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminProductFormPage } from './pages/admin/AdminProductFormPage';
import { AdminPromoFormPage } from './pages/admin/AdminPromoFormPage';
import { CGVPage } from './pages/legal/CGVPage';

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
      {/* Navbar Glass pour toutes les pages sauf l'accueil et les pages admin */}
      {!isHomePage && !isAdminPage && <NavbarGlass />}

      <main className={styles.main}>
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
        </Routes>
      </main>
    </div>
  );
}

// Composant racine qui enveloppe l'application avec les providers
export default function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DarkModeProvider>
  );
}
