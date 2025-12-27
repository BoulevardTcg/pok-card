import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../authContext';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Icônes SVG custom pour l'admin
const DashboardIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const PackageIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const CartIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 6h15l-1.5 9h-12z" />
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M6 6L5 2H2" />
  </svg>
);

const UsersIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="7" r="4" />
    <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-2a3 3 0 0 0-2-2.83" />
  </svg>
);

const InventoryIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);

const TagIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l9 4.5v7L12 22l-9-8.5v-7L12 2z" />
    <circle cx="12" cy="10" r="2" />
  </svg>
);

const StarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ChartIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const MenuIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HomeIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { path: '/admin/products', label: 'Produits', icon: PackageIcon },
  { path: '/admin/orders', label: 'Commandes', icon: CartIcon },
  { path: '/admin/users', label: 'Utilisateurs', icon: UsersIcon },
  { path: '/admin/inventory', label: 'Inventaire', icon: InventoryIcon },
  { path: '/admin/promos', label: 'Codes promo', icon: TagIcon },
  { path: '/admin/reviews', label: 'Avis', icon: StarIcon },
  { path: '/admin/reports', label: 'Rapports', icon: ChartIcon },
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

  const currentPage = menuItems.find((item) => item.path === location.pathname);

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>B</span>
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>Boulevard</span>
              <span className={styles.logoSubtitle}>Admin</span>
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className={styles.nav}>
          <span className={styles.navSection}>Menu principal</span>
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
                <Icon />
                <span>{item.label}</span>
                {isActive && <span className={styles.activeIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link to="/" className={styles.footerLink}>
            <HomeIcon />
            <span>Retour au site</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogoutIcon />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <button
            className={styles.menuButton}
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <MenuIcon />
          </button>

          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.pageTitle}>{currentPage?.label || 'Admin'}</h1>
              <span className={styles.breadcrumb}>
                Administration / {currentPage?.label || 'Page'}
              </span>
            </div>

            {user && (
              <div className={styles.userBadge}>
                <span className={styles.userAvatar}>
                  {(user.firstName || user.username || 'A').charAt(0).toUpperCase()}
                </span>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.firstName || user.username}</span>
                  <span className={styles.userRole}>Administrateur</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
