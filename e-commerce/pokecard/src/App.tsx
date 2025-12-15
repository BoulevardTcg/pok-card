import { useState, useEffect, useRef, useContext } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Home } from './Home'
import { Concours } from './Concours'
import { ProductDetail } from './ProductDetail'
import { CartPage } from './CartPage'
import { CardsPage } from './CardsPage'
import { ProductsPage } from './ProductsPage'
import { CategorySpecificPage } from './CategorySpecificPage'
import { AccessoiresPage } from './AccessoiresPage'
import { ProtectionsPage } from './ProtectionsPage'
import { CheckoutSuccess } from './CheckoutSuccess'
import styles from './App.module.css'
import { TradePage } from './TradePage'
import { TradeSetPage } from './TradeSetPage'
import { ContactPage } from './ContactPage'
import { AuthProvider, useAuth } from './authContext'
import { CartContext } from './cartContext'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import UserProfile from './UserProfile'

// Composant pour les boutons d'authentification
const AuthButtons: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated && user) {
    return (
      <div className={styles.authButtons}>
        <button 
          className={styles.profileButton}
          onClick={() => navigate('/profile')}
          title="Mon profil"
        >
          <span className={styles.profileIcon}>👤</span>
          <span className={styles.profileText}>{user.firstName || user.username}</span>
        </button>
        <button 
          className={styles.logoutButton}
          onClick={logout}
          title="Se déconnecter"
        >
          <span className={styles.logoutIcon}>🚪</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.authButtons}>
      <button 
        className={styles.loginButton}
        onClick={() => navigate('/login')}
        title="Se connecter"
      >
        <span className={styles.loginIcon}>🔑</span>
        <span className={styles.loginText}>Connexion</span>
      </button>
    </div>
  )
}

const navLinks = [
  { 
    label: 'Accueil', 
    path: '/',
    icon: '🏠'
  },
  // Masqué temporairement - en développement
  // { 
  //   label: 'Cartes à Collectionner', 
  //   path: '/cartes',
  //   icon: '🃏'
  // },
  { 
    label: 'Produits TCG', 
    path: '/produits',
    icon: '🛒'
  },
  { 
    label: 'Protections', 
    path: '/protections',
    icon: '🛡️'
  },
  // Masqué temporairement - en développement
  // { 
  //   label: 'Produits Dérivés', 
  //   path: '/produits',
  //   icon: '🎁',
  //   submenu: [
  //     { label: 'Peluches & Figurines', path: '/produits/figurines' },
  //     { label: 'Vêtements & Goodies', path: '/produits/goodies' },
  //     { label: 'Posters & Décos', path: '/produits/decos' }
  //   ]
  // },
  // Masqué temporairement - en développement
  // { 
  //   label: 'Concours', 
  //   path: '/concours',
  //   icon: '🎯'
  // },
  // Masqué temporairement - en développement
  // { 
  //   label: 'Échanges', 
  //   path: '/trade',
  //   icon: '🔄'
  // },
  { 
    label: 'Contact', 
    path: '/contact',
    icon: '📞'
  },
]

// Composant principal de l'application
function AppContent() {
  const [search] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [showHeader, setShowHeader] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const lastScroll = useRef(window.scrollY)
  const { cart } = useContext(CartContext)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY
      if (currentScroll > lastScroll.current && currentScroll > 80) {
        setShowHeader(false)
      } else {
        setShowHeader(true)
      }
      lastScroll.current = currentScroll
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])



  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label)
  }



  return (
    <div className={styles.appBg}>
      <header className={`${styles.header} ${showHeader ? '' : styles.hidden}`}>
        {/* Barre de promotion moderne */}
        <div className={styles.promoBar}>
          <div className={styles.promoContent}>
            <span className={styles.promoIcon}>🚀</span>
            <span>Livraison gratuite dès 50€ | Précommandes One Piece disponibles</span>
            <button className={styles.promoClose}>×</button>
          </div>
        </div>
        
        <div className={styles.headerContent}>
          {/* Logo moderne */}
          <div className={styles.logo} onClick={() => navigate('/')}>
            <div className={styles.logoIcon}>
              <span className={styles.logoText}>PC</span>
              <div className={styles.logoGlow}></div>
            </div>
            <span className={styles.logoTitle}>BoulevardTCG</span>
          </div>
          
          {/* Navigation centrale */}
          <nav className={styles.desktopNav}>
            {navLinks.map(link => (
              <div key={link.path} className={styles.navItem}>
                {link.submenu ? (
                  <div className={styles.dropdownContainer}>
                    <button
                      className={`${styles.navButton} ${location.pathname === link.path ? styles.active : ''}`}
                      onClick={() => toggleDropdown(link.label)}
                      onMouseEnter={() => setActiveDropdown(link.label)}
                    >
                      <span className={styles.navIcon}>{link.icon}</span>
                      {link.label}
                      <span className={styles.dropdownArrow}>▼</span>
                    </button>
                    
                    {activeDropdown === link.label && (
                      <div 
                        className={styles.dropdown}
                        onMouseLeave={() => setActiveDropdown(null)}
                      >
                        {link.submenu.map(subItem => (
                          <button
                            key={subItem.path}
                            className={styles.dropdownItem}
                            onClick={() => {
                              navigate(subItem.path)
                              setActiveDropdown(null)
                            }}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className={`${styles.navButton} ${location.pathname === link.path ? styles.active : ''}`}
                    onClick={() => navigate(link.path)}
                  >
                    <span className={styles.navIcon}>{link.icon}</span>
                    {link.label}
                  </button>
                )}
              </div>
            ))}
          </nav>

          {/* Boutons d'action */}
          <div className={styles.actionButtons}>
            <div className={styles.cartButtonWrapper}>
              <button 
                className={styles.cartButton} 
                onClick={() => navigate('/panier')}
                title="Panier"
              >
                <span className={styles.cartIconWrapper}>
                  <span className={styles.cartIcon}>🛒</span>
                </span>
                <span className={styles.cartText}>Panier</span>
              </button>
              {cartCount > 0 && (
                <span 
                  className={styles.cartBadge}
                  data-count={cartCount > 99 ? '99' : String(cartCount).length}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            
            {/* Boutons d'authentification */}
            <AuthButtons />
          </div>

          {/* Bouton menu mobile */}
          <button
            className={`${styles.mobileMenuButton} ${
              mobileMenuOpen ? styles.open : ''
            }`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu mobile"
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className={`${styles.mobileMenu} ${styles.open}`}>
            <div className={styles.mobileMenuHeader}>
              <h3>Navigation</h3>
            </div>
            <nav className={styles.mobileNav}>
              <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🏠</span>
                  Accueil
                </button>
              </div>
              
              {/* Masqué temporairement - en développement */}
              {/* <div className={styles.mobileNavItem}>
                <button 
                  className={`${styles.mobileNavButton} ${
                    activeDropdown === 'Cartes à Collectionner' ? styles.active : ''
                  }`}
                  onClick={() => setActiveDropdown(activeDropdown === 'Cartes à Collectionner' ? null : 'Cartes à Collectionner')}
                >
                  <span className={styles.mobileNavIcon}>🃏</span>
                  Cartes à Collectionner
                  <span className={`${styles.mobileDropdownArrow} ${
                    activeDropdown === 'Cartes à Collectionner' ? styles.open : ''
                  }`}>
                    ▼
                  </span>
                </button>
                                  <div className={`${styles.mobileDropdownContent} ${
                    activeDropdown === 'Cartes à Collectionner' ? styles.open : ''
                  }`}>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/cartes');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Voir toutes les cartes
                    </button>
                  </div>
              </div> */}
              
              <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/produits');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🛒</span>
                  Produits TCG
                </button>
              </div>

              <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/protections');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🛡️</span>
                  Protections
                </button>
              </div>

                {/* Masqué temporairement - en développement */}
                {/* <div className={styles.mobileNavItem}>
                  <button 
                    className={`${styles.mobileNavButton} ${
                      activeDropdown === 'Produits Dérivés' ? styles.active : ''
                    }`}
                    onClick={() => setActiveDropdown(activeDropdown === 'Produits Dérivés' ? null : 'Produits Dérivés')}
                  >
                    <span className={styles.mobileNavIcon}>🎁</span>
                    Produits Dérivés
                    <span className={`${styles.mobileDropdownArrow} ${
                      activeDropdown === 'Produits Dérivés' ? styles.open : ''
                    }`}>
                      ▼
                    </span>
                  </button>
                  <div className={`${styles.mobileDropdownContent} ${
                    activeDropdown === 'Produits Dérivés' ? styles.open : ''
                  }`}>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/produits/figurines');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Peluches & Figurines
                    </button>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/produits/goodies');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Vêtements & Goodies
                    </button>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/produits/decos');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Posters & Décos
                    </button>
                  </div>
                </div> */}
                
                {/* Masqué temporairement - en développement */}
                {/* <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/concours');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🎯</span>
                  Concours
                </button>
              </div> */}
              
                {/* Masqué temporairement - en développement */}
                {/* <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/trade');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🔄</span>
                  Échanges
                </button>
              </div> */}
              
              <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/contact');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>📞</span>
                  Contact
                </button>
              </div>
            </nav>
            
            <div className={styles.mobileActions}>
              <div className={styles.mobileCartButtonWrapper}>
                <button 
                  className={styles.mobileCartButton}
                  onClick={() => {
                    navigate('/panier');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileCartIconWrapper}>
                    🛒
                  </span>
                  Panier
                </button>
                {cartCount > 0 && (
                  <span 
                    className={styles.cartBadge}
                    data-count={cartCount > 99 ? '99' : String(cartCount).length}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              
              {/* Bouton de connexion mobile */}
              <AuthButtons />
            </div>
          </div>
        )}
      </header>

      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home search={search} />} />
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
          
          {/* Routes d'authentification */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<UserProfile />} />
        </Routes>
      </main>
    </div>
  )
}

// Composant racine qui enveloppe l'application avec l'AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
