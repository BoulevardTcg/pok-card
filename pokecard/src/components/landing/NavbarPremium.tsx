import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CartContext } from '../../cartContext';
import { useAuth } from '../../authContext';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { MoonIcon } from '../icons/MoonIcon';
import { SunIcon } from '../icons/SunIcon';
import styles from './NavbarPremium.module.css';

export default function NavbarPremium() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <div className={styles.navbarContent}>
          {/* Logo */}
          <div className={styles.logo} onClick={() => navigate('/')}>
            <div className={styles.logoGroup}>
              <span className={styles.logoText}>Boulevard</span>
              <span className={styles.logoSubtext}>TCG</span>
            </div>
          </div>

          {/* Menu desktop */}
          <div className={styles.desktopMenu}>
            <button 
              onClick={() => navigate('/')}
              className={`${styles.menuLink} ${location.pathname === '/' ? styles.active : ''}`}
            >
              Accueil
            </button>
            <button 
              onClick={() => navigate('/produits')}
              className={`${styles.menuLink} ${location.pathname === '/produits' ? styles.active : ''}`}
            >
              Boutique
            </button>
            <button 
              onClick={() => navigate('/trade')}
              className={`${styles.menuLink} ${location.pathname === '/trade' ? styles.active : ''}`}
            >
              Cartes
            </button>
            <button 
              onClick={() => navigate('/actualites')}
              className={`${styles.menuLink} ${location.pathname === '/actualites' ? styles.active : ''}`}
            >
              Actualités
            </button>
            <button 
              onClick={() => navigate('/contact')}
              className={`${styles.menuLink} ${location.pathname === '/contact' ? styles.active : ''}`}
            >
              Contact
            </button>
          </div>

          {/* Panier + Auth + Menu mobile */}
          <div className={styles.navbarActions}>
            {/* Panier */}
            <div className={styles.cartWrapper}>
              <button
                onClick={() => navigate('/panier')}
                className={styles.cartButton}
                title="Panier"
              >
                🛒
                {cartCount > 0 && (
                  <span className={styles.cartBadge}>{cartCount > 99 ? '99+' : cartCount}</span>
                )}
              </button>
            </div>
            
            {/* Auth */}
            {isAuthenticated && user ? (
              <div className={styles.authButtons}>
                <button
                  onClick={() => navigate('/profile')}
                  className={styles.profileButton}
                  title="Mon profil"
                >
                  👤 {user.firstName || user.username}
                </button>
                <button
                  onClick={logout}
                  className={styles.logoutButton}
                  title="Se déconnecter"
                >
                  🚪
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className={styles.loginButton}
              >
                🔑 Connexion
              </button>
            )}
            
            {/* Bouton Dark Mode */}
            <button
              onClick={toggleDarkMode}
              className={styles.darkModeButton}
              aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
            
            <button
              className={styles.mobileMenuButton}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {isMenuOpen && (
          <div className={styles.mobileMenu}>
            <button 
              onClick={() => {
                navigate('/');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              Accueil
            </button>
            <button 
              onClick={() => {
                navigate('/produits');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              Boutique
            </button>
            <button 
              onClick={() => {
                navigate('/trade');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              Cartes
            </button>
            <button
              onClick={() => {
                navigate('/actualites');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              Actualités
            </button>
            <button
              onClick={() => {
                navigate('/contact');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              Contact
            </button>
            <button
              onClick={() => {
                navigate('/panier');
                setIsMenuOpen(false);
              }}
              className={styles.mobileMenuLink}
            >
              🛒 Panier {cartCount > 0 && `(${cartCount})`}
            </button>
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsMenuOpen(false);
                  }}
                  className={styles.mobileMenuLink}
                >
                  👤 Mon profil
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className={styles.mobileMenuLink}
                >
                  🚪 Déconnexion
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  navigate('/login');
                  setIsMenuOpen(false);
                }}
                className={styles.mobileMenuLink}
              >
                🔑 Connexion
              </button>
            )}
            <button
              onClick={() => {
                toggleDarkMode();
              }}
              className={styles.mobileMenuLink}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
                {isDark ? 'Mode clair' : 'Mode sombre'}
              </span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

