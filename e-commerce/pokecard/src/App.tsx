import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Home } from './Home'
import { Concours } from './Concours'
import { ProductDetail } from './ProductDetail'
import { CartPage } from './CartPage'
import { CategoryPage } from './CategoryPage'
import styles from './App.module.css'
import { TradePage } from './TradePage'
import { TradeSetPage } from './TradeSetPage'

const navLinks = [
  { label: 'Accueil', path: '/' },
  { label: 'Pokémon', path: '/pokemon' },
  { label: 'One Piece', path: '/onepiece' },
  { label: 'Concours', path: '/concours' },
  { label: 'Échanges', path: '/trade' },
  { label: 'Contact', path: '/contact' },
]

export default function App() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [showHeader, setShowHeader] = useState(true)
  const lastScroll = useRef(window.scrollY)

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

  return (
    <div className={styles.appBg}>
      <header className={styles.header + (showHeader ? '' : ' ' + styles.hideHeader)}>
        <div className={styles.headerContent}>
          <div className={styles.logo} onClick={() => navigate('/')}>PokéCard</div>
          <div className={styles.centerNav}>
            <div className={styles.searchBar}>
              {location.pathname === '/' && (
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Rechercher une carte ou un produit..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              )}
            </div>
            <nav>
              {navLinks.map(link => (
                <button
                  key={link.path}
                  className={location.pathname === link.path ? styles.active : ''}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
          <button className={location.pathname === '/panier' ? styles.active : ''} onClick={() => navigate('/panier')}>
            🛒 Panier
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home search={search} />} />
          <Route path="/pokemon" element={<CategoryPage category="pokemon" />} />
          <Route path="/onepiece" element={<CategoryPage category="onepiece" />} />
          <Route path="/concours" element={<Concours />} />
          <Route path="/produit/:id" element={<ProductDetail />} />
          <Route path="/panier" element={<CartPage />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/trade/set/:id" element={<TradeSetPage />} />
          <Route path="/contact" element={<div style={{padding:40}}>Contact à venir…</div>} />
        </Routes>
      </main>
    </div>
  )
}
