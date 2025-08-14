import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Home } from './Home'
import { Concours } from './Concours'
import { ProductDetail } from './ProductDetail'
import { CartPage } from './CartPage'
import { CategoryPage } from './CategoryPage'
import { PokemonProductsPage } from './PokemonProductsPage'
import { OnePieceProductsPage } from './OnePieceProductsPage'
import { CardsPage } from './CardsPage'
import { ProductsPage } from './ProductsPage'
import { CategorySpecificPage } from './CategorySpecificPage'
import { AccessoiresPage } from './AccessoiresPage'
import styles from './App.module.css'
import { TradePage } from './TradePage'
import { TradeSetPage } from './TradeSetPage'

const navLinks = [
  { 
    label: 'Accueil', 
    path: '/',
    icon: '🏠'
  },
              { 
              label: 'Cartes à Collectionner', 
              path: '/cartes',
              icon: '🃏'
            },
              { 
              label: 'Accessoires TCG', 
              path: '/accessoires',
              icon: '🛡️',
              submenu: [
                { label: 'Étuis & Protections', path: '/accessoires/etuis' },
                { label: 'Sleeves & Binders', path: '/accessoires/sleeves' },
                { label: 'Displays & Présentoirs', path: '/accessoires/displays' },
                { label: 'Accessoires de Jeu', path: '/accessoires/jeu' }
              ]
            },
            { 
              label: 'Produits Dérivés', 
              path: '/produits',
              icon: '🎁',
              submenu: [
                { label: 'Peluches & Figurines', path: '/produits/figurines' },
                { label: 'Vêtements & Goodies', path: '/produits/goodies' },
                { label: 'Posters & Décos', path: '/produits/decos' }
              ]
            },

  { 
    label: 'Concours', 
    path: '/concours',
    icon: '🎯'
  },
  { 
    label: 'Échanges', 
    path: '/trade',
    icon: '🔄'
  },
  { 
    label: 'Contact', 
    path: '/contact',
    icon: '📞'
  },
]

export default function App() {
  const [search] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [showHeader, setShowHeader] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const lastScroll = useRef(window.scrollY)
  const [cartCount] = useState(3)
  
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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
    setActiveDropdown(null)
  }

  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    setActiveDropdown(null)
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
            <span className={styles.logoTitle}>PokéCard</span>
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
            <button 
              className={styles.cartButton} 
              onClick={() => navigate('/panier')}
              title="Panier"
            >
              <span className={styles.cartIcon}>🛒</span>
              <span className={styles.cartText}>Panier</span>
            </button>
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
              
              <div className={styles.mobileNavItem}>
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
              </div>
              
                              <div className={styles.mobileNavItem}>
                  <button 
                    className={`${styles.mobileNavButton} ${
                      activeDropdown === 'Accessoires TCG' ? styles.active : ''
                    }`}
                    onClick={() => setActiveDropdown(activeDropdown === 'Accessoires TCG' ? null : 'Accessoires TCG')}
                  >
                    <span className={styles.mobileNavIcon}>🛡️</span>
                    Accessoires TCG
                    <span className={`${styles.mobileDropdownArrow} ${
                      activeDropdown === 'Accessoires TCG' ? styles.open : ''
                    }`}>
                      ▼
                    </span>
                  </button>
                  <div className={`${styles.mobileDropdownContent} ${
                    activeDropdown === 'Accessoires TCG' ? styles.open : ''
                  }`}>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/accessoires/etuis');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Étuis & Protections
                    </button>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/accessoires/sleeves');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Sleeves & Binders
                    </button>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/accessoires/displays');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Displays & Présentoirs
                    </button>
                    <button 
                      className={styles.mobileDropdownItem}
                      onClick={() => {
                        navigate('/accessoires/jeu');
                        setMobileMenuOpen(false);
                        setActiveDropdown(null);
                      }}
                    >
                      Accessoires de Jeu
                    </button>
                  </div>
                </div>

                <div className={styles.mobileNavItem}>
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
                </div>
                
                <div className={styles.mobileNavItem}>
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
              </div>
              
              <div className={styles.mobileNavItem}>
                <button 
                  className={styles.mobileNavButton}
                  onClick={() => {
                    navigate('/echanges');
                    setMobileMenuOpen(false);
                  }}
                >
                  <span className={styles.mobileNavIcon}>🔄</span>
                  Échanges
                </button>
              </div>
              
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
              <button 
                className={styles.mobileCartButton}
                onClick={() => {
                  navigate('/panier');
                  setMobileMenuOpen(false);
                }}
              >
                🛒 Panier ({cartCount})
              </button>
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

          <Route path="/concours" element={<Concours />} />
          <Route path="/produit/:id" element={<ProductDetail />} />
          <Route path="/panier" element={<CartPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/trade/set/:id" element={<TradeSetPage />} />
          <Route path="/contact" element={<div>Contact</div>} />
        </Routes>
      </main>
    </div>
  )
}
