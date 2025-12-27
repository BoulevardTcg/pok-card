import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { CartIcon, UserIcon, MenuIcon, CloseIcon, LogOutIcon } from '../icons/Icons';
import styles from './NavbarPremium.module.css';

export default function NavbarPremium() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, isAuthenticated, logout } = useAuth();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Seulement mettre à jour si le changement de scroll est significatif
          // Cela évite les faux positifs lors des gestes tactiles sur la navbar
          if (Math.abs(currentScrollY - lastScrollY) > 5 || currentScrollY <= 20) {
            setIsScrolled(currentScrollY > 20);
            lastScrollY = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isMenuOpen]);

  const navLinks = [
    { path: '/', label: 'Accueil' },
    { path: '/produits', label: 'Collection' },
    { path: '/trade', label: 'Cartes' },
    { path: '/actualites', label: 'News' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* Logo */}
        <button
          className={styles.logo}
          onClick={() => navigate('/')}
          aria-label="Retour à l'accueil"
        >
          <span className={styles.logoMark}>B</span>
          <span className={styles.logoText}>Boulevard</span>
        </button>

        {/* Navigation desktop */}
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

        {/* Actions */}
        <div className={styles.actions}>
          {/* Panier */}
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

          {/* Compte */}
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

          {/* Menu mobile */}
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

      {/* Menu mobile overlay */}
      <div className={`${styles.mobileMenu} ${isMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuContent}>
          <div className={styles.mobileNavLinks}>
            {navLinks.map((link, index) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`${styles.mobileNavLink} ${location.pathname === link.path ? styles.active : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className={styles.mobileNavNumber}>0{index + 1}</span>
                <span className={styles.mobileNavLabel}>{link.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.mobileMenuFooter}>
            {isAuthenticated && user ? (
              <div className={styles.mobileUserInfo}>
                <button onClick={() => navigate('/profile')} className={styles.mobileUserButton}>
                  <UserIcon size={18} />
                  <span>Mon compte</span>
                </button>
                <button onClick={logout} className={styles.mobileLogout}>
                  Déconnexion
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('/login')} className={styles.mobileLoginButton}>
                Connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
