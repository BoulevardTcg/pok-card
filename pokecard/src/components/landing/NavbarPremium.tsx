import { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { CartIcon, UserIcon, MenuIcon, CloseIcon, LogOutIcon } from '../icons/Icons';
import styles from './NavbarPremium.module.css';

export default function NavbarPremium() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolled = false;
  const [isMounted, setIsMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('noScroll');
    } else {
      document.body.classList.remove('noScroll');
    }
    return () => {
      document.body.classList.remove('noScroll');
    };
  }, [isMenuOpen]);

  const navLinks = [
    { path: '/', label: 'Accueil' },
    { path: '/produits', label: 'Collection' },
    { path: '/trade', label: 'Cartes' },
    { path: '/actualites', label: 'News' },
    { path: '/contact', label: 'Contact' },
  ];

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    closeMenu();
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <button
          className={styles.logo}
          onClick={() => navigate('/')}
          aria-label="Retour à l'accueil"
        >
          <span className={styles.logoMark}>B</span>
          <span className={styles.logoText}>Boulevard</span>
        </button>

        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`${styles.navLink} ${location.pathname === link.path ? styles.active : ''}`}
            >
              {link.label}
              <span className={styles.linkUnderline} />
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => navigate('/panier')}
            className={styles.iconButton}
            aria-label={`Panier${cartCount > 0 ? ` (${cartCount} articles)` : ''}`}
          >
            <CartIcon size={20} />
            {cartCount > 0 && (
              <span className={styles.cartBadge}>{cartCount > 9 ? '9+' : cartCount}</span>
            )}
          </button>

          {isAuthenticated && user ? (
            <div className={styles.userMenu}>
              <button
                onClick={() => navigate('/profile')}
                className={styles.userButton}
                aria-label="Mon compte"
              >
                <UserIcon size={20} />
                <span className={styles.userName}>{user.firstName || user.username}</span>
              </button>
              <button onClick={logout} className={styles.iconButton} aria-label="Se déconnecter">
                <LogOutIcon size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className={styles.loginButton}>
              Connexion
            </button>
          )}

          <button
            className={styles.menuButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {isMounted &&
        isMenuOpen &&
        createPortal(
          <div className={styles.mobileMenuOverlay} onClick={closeMenu}>
            <aside
              className={styles.mobileMenu}
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navigation"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.mobileMenuHeader}>
                <button
                  className={styles.logo}
                  onClick={() => handleNavClick('/')}
                  aria-label="Retour à l'accueil"
                >
                  <span className={styles.logoMark}>B</span>
                  <span className={styles.logoText}>Boulevard</span>
                </button>
                <button
                  className={styles.mobileMenuClose}
                  onClick={closeMenu}
                  aria-label="Fermer le menu"
                >
                  <CloseIcon size={24} />
                </button>
              </div>

              <nav className={styles.mobileNavLinks}>
                {navLinks.map((link) => (
                  <button
                    key={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={`${styles.mobileNavLink} ${location.pathname === link.path ? styles.active : ''}`}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              <div className={styles.mobileMenuFooter}>
                <button
                  onClick={() => handleNavClick('/panier')}
                  className={styles.mobileCartButton}
                >
                  <CartIcon size={20} />
                  <span>Panier</span>
                  {cartCount > 0 && (
                    <span className={styles.mobileCartBadge}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>

                {isAuthenticated && user ? (
                  <div className={styles.mobileUserInfo}>
                    <button
                      onClick={() => handleNavClick('/profile')}
                      className={styles.mobileUserButton}
                    >
                      <UserIcon size={18} />
                      <span>{user.firstName || user.username}</span>
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        closeMenu();
                      }}
                      className={styles.mobileLogout}
                    >
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleNavClick('/login')}
                    className={styles.mobileLoginButton}
                  >
                    Connexion
                  </button>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}
    </nav>
  );
}
