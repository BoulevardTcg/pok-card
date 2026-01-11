import { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { CartContext, type Product as ProductType } from '../../cartContext';
import { useAuth } from '../../authContext';
import { useDarkMode } from '../../contexts/useDarkMode';
import { listProducts, getImageUrl } from '../../api';
import { sanitizeInput } from '../../utils/security';
import {
  CartIcon,
  UserIcon,
  LogOutIcon,
  DashboardIcon,
  SearchIcon,
  MenuIcon,
  CloseIcon,
} from '../icons/Icons';
import { SunIcon } from '../icons/SunIcon';
import { MoonIcon } from '../icons/MoonIcon';
import styles from './NavbarGlass.module.css';

// Constantes de sécurité
const MAX_SEARCH_LENGTH = 100;
const MIN_SEARCH_LENGTH = 2;

// Configuration des items de navigation (facilement modifiable)
const NAV_ITEMS = [
  { label: 'Accueil', to: '/' },
  { label: 'Boutique', to: '/produits' },
  { label: 'Échange', to: '/trade' },
  { label: 'Actualités', to: '/actualites' },
  { label: 'Contact', to: '/contact' },
] as const;

// Configuration spring premium
const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 25,
};

const SPRING_CONFIG_SOFT = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 22,
};

export default function NavbarGlass() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Mount check pour le portal
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Sanitisation et validation de la recherche (défini en dehors pour éviter les dépendances)
  const sanitizeSearchQuery = useCallback((query: string): string | null => {
    // Vérifier que c'est bien une string
    if (typeof query !== 'string') {
      return null;
    }

    // Trim et vérifier la longueur minimale
    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      return null;
    }

    // Limiter la longueur maximale
    if (trimmed.length > MAX_SEARCH_LENGTH) {
      return trimmed.slice(0, MAX_SEARCH_LENGTH).trim();
    }

    // Sanitiser avec les fonctions de sécurité (retire < > javascript: on*= etc.)
    const sanitized = sanitizeInput(trimmed);

    // Vérifier qu'il reste quelque chose après sanitisation
    if (!sanitized || sanitized.length < MIN_SEARCH_LENGTH) {
      return null;
    }

    // Vérifier qu'il n'y a pas de caractères de contrôle (sans regex pour éviter no-control-regex)
    for (let i = 0; i < sanitized.length; i++) {
      const charCode = sanitized.charCodeAt(i);
      // Caractères de contrôle: 0x00-0x1F (0-31) et 0x7F (127)
      if ((charCode >= 0x00 && charCode <= 0x1f) || charCode === 0x7f) {
        return null;
      }
    }

    return sanitized;
  }, []);

  // Recherche de produits avec debounce
  const searchProducts = useCallback(
    async (query: string) => {
      const sanitizedQuery = sanitizeSearchQuery(query);

      if (!sanitizedQuery) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = (await listProducts({
          search: sanitizedQuery,
          limit: 5, // Limiter à 5 résultats pour l'autocomplétion
        })) as {
          products: ProductType[];
        };

        if (response && response.products) {
          // Filtrer pour exclure les accessoires
          const filtered = response.products.filter((p) => p.category !== 'Accessoires');
          setSearchResults(filtered);
          setShowSearchResults(filtered.length > 0);
        } else {
          setSearchResults([]);
          setShowSearchResults(false);
        }
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setIsSearching(false);
      }
    },
    [sanitizeSearchQuery]
  );

  // Debounce de la recherche avec validation
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Vérifier la longueur avant de rechercher
    if (searchQuery.length > MAX_SEARCH_LENGTH) {
      // Limiter automatiquement la longueur
      setSearchQuery(searchQuery.slice(0, MAX_SEARCH_LENGTH));
      return;
    }

    if (searchQuery.trim().length >= MIN_SEARCH_LENGTH) {
      searchTimeoutRef.current = setTimeout(() => {
        searchProducts(searchQuery);
      }, 300); // Attendre 300ms après la dernière frappe
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchProducts]);

  // Fermer les résultats si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Synchroniser le champ de recherche avec l'URL si on est sur la page produits
  useEffect(() => {
    if (location.pathname === '/produits') {
      const urlParams = new URLSearchParams(location.search);
      const urlSearchQuery = urlParams.get('search') || '';
      setSearchQuery(urlSearchQuery);
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [location.pathname, location.search]);

  // Fermer le menu mobile quand la route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('noScroll');
    } else {
      document.body.classList.remove('noScroll');
    }
    return () => {
      document.body.classList.remove('noScroll');
    };
  }, [isMobileMenuOpen]);

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Gestion de la recherche avec validation
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedQuery = sanitizeSearchQuery(searchQuery);

    if (sanitizedQuery) {
      // Encodage URL sécurisé
      navigate(`/produits?search=${encodeURIComponent(sanitizedQuery)}`);
      setIsSearchFocused(false);
      setShowSearchResults(false);
    } else {
      navigate('/produits');
    }
  };

  // Validation de l'input pendant la saisie
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Limiter la longueur maximale côté client
    if (value.length > MAX_SEARCH_LENGTH) {
      value = value.slice(0, MAX_SEARCH_LENGTH);
    }

    setSearchQuery(value);
  };

  // Navigation vers un produit sélectionné
  const handleProductSelect = (product: ProductType) => {
    if (product.slug) {
      navigate(`/produit/${product.slug}`);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearchFocused(false);
    }
  };

  // Trouver l'item actif
  const activeItem = NAV_ITEMS.find((item) => {
    if (item.to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.to);
  });

  // Variants pour l'entrée de la navbar
  const navbarVariants = {
    initial: {
      y: shouldReduceMotion ? 0 : -8,
      opacity: shouldReduceMotion ? 1 : 0,
    },
    animate: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion
        ? { duration: 0.2 }
        : {
            ...SPRING_CONFIG,
            opacity: { duration: 0.3 },
          },
    },
  };

  // Variants pour les liens
  const navLinkVariants = {
    rest: { y: 0, opacity: 0.9 },
    hover: {
      y: shouldReduceMotion ? 0 : -1,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG_SOFT,
    },
    active: {
      opacity: 1,
    },
  };

  // Variants pour les boutons
  const buttonVariants = {
    rest: { scale: 1 },
    hover: {
      scale: shouldReduceMotion ? 1 : 1.02,
      transition: shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG,
    },
    tap: {
      scale: shouldReduceMotion ? 1 : 0.98,
      transition: shouldReduceMotion ? { duration: 0.1 } : SPRING_CONFIG,
    },
  };

  return (
    <motion.nav
      className={styles.navbar}
      initial="initial"
      animate="animate"
      variants={navbarVariants}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className={styles.pill}>
        <div className={styles.container}>
          {/* Logo (Gauche) */}
          <motion.button
            className={styles.logo}
            onClick={() => navigate('/')}
            aria-label="Retour à l'accueil"
            whileHover={{ scale: shouldReduceMotion ? 1 : 1.02 }}
            whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG}
          >
            <span className={styles.logoText}>Boulevard</span>
          </motion.button>

          {/* Navigation Centrale */}
          <ul className={styles.navLinks} role="list">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem?.to === item.to;
              const isHovered = hoveredItem === item.to;
              const shouldShowUnderline = isActive || isHovered;

              return (
                <li key={item.to} role="none">
                  <Link
                    to={item.to}
                    className={styles.navLink}
                    onMouseEnter={() => setHoveredItem(item.to)}
                    onMouseLeave={() => setHoveredItem(null)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <motion.span
                      variants={navLinkVariants}
                      initial="rest"
                      animate={isActive ? 'active' : isHovered ? 'hover' : 'rest'}
                      className={styles.navLinkText}
                    >
                      {item.label}
                    </motion.span>

                    {/* Underline animé avec layoutId */}
                    {shouldShowUnderline && (
                      <motion.div
                        className={styles.underline}
                        layoutId="navbar-underline"
                        initial={false}
                        transition={
                          shouldReduceMotion ? { duration: 0.2, ease: 'easeInOut' } : SPRING_CONFIG
                        }
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Actions (Droite) */}
          <div className={styles.actions}>
            {/* Recherche avec autocomplétion */}
            <div className={styles.searchWrapper} ref={searchResultsRef}>
              <form onSubmit={handleSearch} className={styles.searchForm}>
                <motion.div
                  className={`${styles.searchContainer} ${isSearchFocused ? styles.searchFocused : ''} ${showSearchResults ? styles.searchContainerOpen : ''}`}
                  whileHover={{ scale: shouldReduceMotion ? 1 : 1.02 }}
                  transition={shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG}
                >
                  <SearchIcon size={16} className={styles.searchIcon} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    maxLength={MAX_SEARCH_LENGTH}
                    onFocus={() => {
                      setIsSearchFocused(true);
                      if (searchResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    onBlur={() => {
                      // Délai pour permettre le clic sur un résultat
                      setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                    className={styles.searchInput}
                    aria-label="Rechercher des produits"
                    aria-expanded={showSearchResults}
                    aria-autocomplete="list"
                  />
                  {isSearching && <div className={styles.searchSpinner} />}
                </motion.div>
              </form>

              {/* Résultats de recherche */}
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    className={styles.searchResults}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG_SOFT}
                  >
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        className={styles.searchResultItem}
                        onClick={() => handleProductSelect(product)}
                        onMouseDown={(e) => e.preventDefault()} // Empêcher onBlur
                      >
                        {product.image?.url && (
                          <img
                            src={getImageUrl(product.image.url)}
                            alt={product.image.altText || product.name}
                            className={styles.searchResultImage}
                          />
                        )}
                        <div className={styles.searchResultContent}>
                          <span className={styles.searchResultName}>{product.name}</span>
                          {product.minPriceCents && (
                            <span className={styles.searchResultPrice}>
                              {(product.minPriceCents / 100).toFixed(2).replace('.', ',')} €
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {(() => {
                      const sanitizedQuery = sanitizeSearchQuery(searchQuery);
                      return (
                        sanitizedQuery && (
                          <button
                            className={styles.searchViewAll}
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/produits?search=${encodeURIComponent(sanitizedQuery)}`);
                              setShowSearchResults(false);
                              setIsSearchFocused(false);
                            }}
                          >
                            Voir tous les résultats pour "{sanitizedQuery}"
                          </button>
                        )
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toggle thème (soleil/lune) */}
            <motion.button
              onClick={toggleDarkMode}
              className={styles.themeToggle}
              aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              aria-pressed={isDark}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isDark ? 'moon' : 'sun'}
                  initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                  transition={shouldReduceMotion ? { duration: 0.15 } : { duration: 0.2 }}
                  className={styles.themeIconWrapper}
                >
                  {isDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Panier (toujours visible) */}
            <motion.button
              onClick={() => navigate('/panier')}
              className={styles.iconButton}
              aria-label={`Panier${cartCount > 0 ? ` (${cartCount} articles)` : ''}`}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <CartIcon size={18} />
              {cartCount > 0 && (
                <motion.span
                  className={styles.cartBadge}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={shouldReduceMotion ? { duration: 0.2 } : SPRING_CONFIG}
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </motion.span>
              )}
            </motion.button>

            {/* Utilisateur connecté ou non */}
            {isAuthenticated && user ? (
              <>
                {user.isAdmin && (
                  <motion.button
                    onClick={() => navigate('/admin/dashboard')}
                    className={styles.iconButton}
                    aria-label="Dashboard Admin"
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <DashboardIcon size={16} />
                  </motion.button>
                )}

                <motion.button
                  onClick={() => navigate('/profile')}
                  className={styles.userButton}
                  aria-label="Mon compte"
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <UserIcon size={16} />
                  <span className={styles.userName}>{user.firstName || user.username}</span>
                </motion.button>

                <motion.button
                  onClick={logout}
                  className={styles.iconButton}
                  aria-label="Se déconnecter"
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <LogOutIcon size={16} />
                </motion.button>
              </>
            ) : (
              <Link to="/login" className={styles.signInLink} aria-label="Se connecter">
                Connexion
              </Link>
            )}

            {/* Bouton menu mobile */}
            <motion.button
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileMenuOpen}
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              {isMobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Menu mobile - Portal depuis le bas */}
      {isMounted &&
        createPortal(
          <AnimatePresence mode="wait">
            {isMobileMenuOpen && (
              <div key="mobile-menu" className={styles.mobileMenuWrapper}>
                {/* Overlay */}
                <motion.div
                  className={styles.mobileOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={closeMenu}
                  aria-hidden="true"
                />

                {/* Menu mobile slide depuis le bas */}
                <motion.div
                  className={styles.mobileMenu}
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.3, ease: 'easeInOut' }
                      : { ...SPRING_CONFIG, duration: 0.4 }
                  }
                  role="dialog"
                  aria-modal="true"
                  aria-label="Menu de navigation mobile"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle bar */}
                  <div className={styles.mobileMenuHandle} onClick={closeMenu} />

                  {/* Header avec logo et fermeture */}
                  <div className={styles.mobileMenuHeader}>
                    <button
                      className={styles.mobileLogoButton}
                      onClick={() => {
                        navigate('/');
                        closeMenu();
                      }}
                      aria-label="Retour à l'accueil"
                    >
                      <span className={styles.logoText}>Boulevard</span>
                    </button>
                    <button
                      className={styles.mobileCloseButton}
                      onClick={closeMenu}
                      aria-label="Fermer le menu"
                    >
                      <CloseIcon size={24} />
                    </button>
                  </div>

                  {/* Recherche mobile */}
                  <div className={styles.mobileSearchWrapper}>
                    <form onSubmit={handleSearch} className={styles.mobileSearchForm}>
                      <div
                        className={`${styles.mobileSearchContainer} ${isSearchFocused ? styles.searchFocused : ''} ${showSearchResults ? styles.searchContainerOpen : ''}`}
                      >
                        <SearchIcon size={18} className={styles.searchIcon} />
                        <input
                          type="text"
                          placeholder="Rechercher un produit..."
                          value={searchQuery}
                          onChange={handleSearchInputChange}
                          maxLength={MAX_SEARCH_LENGTH}
                          onFocus={() => {
                            setIsSearchFocused(true);
                            if (searchResults.length > 0) {
                              setShowSearchResults(true);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setIsSearchFocused(false), 200);
                          }}
                          className={styles.searchInput}
                          aria-label="Rechercher des produits"
                          aria-expanded={showSearchResults}
                          aria-autocomplete="list"
                        />
                        {isSearching && <div className={styles.searchSpinner} />}
                      </div>
                    </form>

                    {/* Résultats de recherche mobile */}
                    <AnimatePresence>
                      {showSearchResults && searchResults.length > 0 && (
                        <motion.div
                          className={styles.mobileSearchResults}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={shouldReduceMotion ? { duration: 0.15 } : SPRING_CONFIG_SOFT}
                        >
                          {searchResults.map((product) => (
                            <button
                              key={product.id}
                              className={styles.searchResultItem}
                              onClick={() => {
                                handleProductSelect(product);
                                closeMenu();
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {product.image?.url && (
                                <img
                                  src={getImageUrl(product.image.url)}
                                  alt={product.image.altText || product.name}
                                  className={styles.searchResultImage}
                                />
                              )}
                              <div className={styles.searchResultContent}>
                                <span className={styles.searchResultName}>{product.name}</span>
                                {product.minPriceCents && (
                                  <span className={styles.searchResultPrice}>
                                    {(product.minPriceCents / 100).toFixed(2).replace('.', ',')} €
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                          {(() => {
                            const sanitizedQuery = sanitizeSearchQuery(searchQuery);
                            return (
                              sanitizedQuery && (
                                <button
                                  className={styles.searchViewAll}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(
                                      `/produits?search=${encodeURIComponent(sanitizedQuery)}`
                                    );
                                    setShowSearchResults(false);
                                    closeMenu();
                                  }}
                                >
                                  Voir tous les résultats pour "{sanitizedQuery}"
                                </button>
                              )
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Navigation mobile */}
                  <nav className={styles.mobileNavLinks} role="navigation">
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeItem?.to === item.to;

                      return (
                        <button
                          key={item.to}
                          onClick={() => {
                            navigate(item.to);
                            closeMenu();
                          }}
                          className={`${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          {item.label}
                          {isActive && <span className={styles.mobileActiveIndicator} />}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Actions mobile */}
                  <div className={styles.mobileActions}>
                    {/* Toggle thème mobile */}
                    <motion.button
                      onClick={toggleDarkMode}
                      className={styles.mobileActionButton}
                      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
                      aria-pressed={isDark}
                      whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
                    >
                      {isDark ? <MoonIcon size={20} /> : <SunIcon size={20} />}
                      <span>{isDark ? 'Mode sombre' : 'Mode clair'}</span>
                      <span className={styles.mobileThemeIndicator}>{isDark ? '🌙' : '☀️'}</span>
                    </motion.button>

                    <motion.button
                      onClick={() => {
                        navigate('/panier');
                        closeMenu();
                      }}
                      className={styles.mobileActionButton}
                      aria-label={`Panier${cartCount > 0 ? ` (${cartCount} articles)` : ''}`}
                      whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
                    >
                      <CartIcon size={20} />
                      <span>Panier</span>
                      {cartCount > 0 && (
                        <span className={styles.mobileCartBadge}>
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </motion.button>

                    {isAuthenticated && user ? (
                      <>
                        {user.isAdmin && (
                          <motion.button
                            onClick={() => {
                              navigate('/admin/dashboard');
                              closeMenu();
                            }}
                            className={styles.mobileActionButton}
                            aria-label="Dashboard Admin"
                            whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
                          >
                            <DashboardIcon size={20} />
                            <span>Dashboard Admin</span>
                          </motion.button>
                        )}

                        <motion.button
                          onClick={() => {
                            navigate('/profile');
                            closeMenu();
                          }}
                          className={styles.mobileActionButton}
                          aria-label="Mon compte"
                          whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
                        >
                          <UserIcon size={20} />
                          <span>{user.firstName || user.username}</span>
                        </motion.button>

                        <motion.button
                          onClick={() => {
                            logout();
                            closeMenu();
                          }}
                          className={`${styles.mobileActionButton} ${styles.mobileLogoutButton}`}
                          aria-label="Se déconnecter"
                          whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
                        >
                          <LogOutIcon size={20} />
                          <span>Déconnexion</span>
                        </motion.button>
                      </>
                    ) : (
                      <Link
                        to="/login"
                        className={`${styles.mobileActionButton} ${styles.mobileLoginButton}`}
                        onClick={closeMenu}
                        aria-label="Se connecter"
                      >
                        <UserIcon size={20} />
                        <span>Connexion</span>
                      </Link>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.nav>
  );
}
