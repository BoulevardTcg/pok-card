import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Tag,
  Star,
  BarChart3,
  Menu,
  X,
  LogOut,
  Home
} from 'lucide-react';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/products', label: 'Produits', icon: Package },
  { path: '/admin/orders', label: 'Commandes', icon: ShoppingCart },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/inventory', label: 'Stock', icon: Package },
  { path: '/admin/promos', label: 'Codes promo', icon: Tag },
  { path: '/admin/reviews', label: 'Avis', icon: Star },
  { path: '/admin/reports', label: 'Rapports', icon: BarChart3 }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logo}>Admin Panel</h2>
          <button
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/" className={styles.footerLink}>
            <Home size={18} />
            <span>Retour au site</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <button
            className={styles.menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
          <div className={styles.headerInfo}>
            <h1 className={styles.pageTitle}>
              {menuItems.find(item => item.path === location.pathname)?.label || 'Admin'}
            </h1>
            {user && (
              <span className={styles.userInfo}>
                {user.firstName || user.username}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

