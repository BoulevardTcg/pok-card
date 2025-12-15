import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import HoloCard from './HoloCard'
import { loadFoilMap } from './foilMap'
import { AnimatedSection } from './components/AnimatedSection'
import { AnimatedGrid } from './components/AnimatedGrid'

function getCardImageUrl(card: any, quality: 'low' | 'high' = 'high') {
  return quality === 'high' ? card.imagesLarge || undefined : card.imagesSmall || undefined;
}

export function TradeSetPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [foilMap, setFoilMap] = useState<Map<string, string> | null>(null)

  useEffect(() => {
    if (!id) return
    
    // Remonter en haut de la page
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Charger les cartes et le foilMap en parallèle
    Promise.all([
      fetch(`http://localhost:8080/api/trade/sets/${encodeURIComponent(id)}/cards`)
        .then(r => r.json())
        .then((data: any) => Array.isArray(data) ? data : [])
        .catch(error => {
          console.error('Erreur lors du chargement des cartes:', error)
          return []
        }),
      loadFoilMap().catch(() => new Map())
    ]).then(([cardsData, foilMapData]) => {
      setCards(cardsData)
      setFoilMap(foilMapData)
      setLoading(false)
    })
  }, [id])

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRarity = selectedRarity === 'all' || card.rarity === selectedRarity
      return matchesSearch && matchesRarity
    })
  }, [cards, searchQuery, selectedRarity])

  const rarityOptions = useMemo(() => {
    return Array.from(new Set(cards.map(card => card.rarity).filter(Boolean)))
  }, [cards])

  if (loading) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        width: '100%', 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white'
      }}>
        <div style={{ fontSize: 18 }}>
          <div style={{ marginBottom: 16 }}>🔄</div>
          Chargement des cartes...
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '24px'
    }}>
      {/* Header avec navigation */}
      <AnimatedSection animation="fadeUp" delay={0.1}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 32,
          padding: '24px 0'
        }}>
          <button
            onClick={() => navigate('/trade')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            ← Retour aux échanges
          </button>
          
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: 16,
            background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Série {id}
          </h1>
          
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            {cards.length} cartes disponibles
          </p>
        </div>
      </AnimatedSection>

      {/* Barre de recherche et filtres */}
      <AnimatedSection animation="slideLeft" delay={0.2}>
        <div style={{ 
          marginBottom: 32,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ 
            position: 'relative',
            flex: '1 1 400px',
            maxWidth: '500px'
          }}>
            <input
              type="text"
              placeholder="🔍 Rechercher un Pokémon..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '2px solid #334155',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#06b6d4'
                e.target.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#334155'
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
          
          <select
            value={selectedRarity}
            onChange={e => setSelectedRarity(e.target.value)}
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              border: '2px solid #334155',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              fontSize: '16px',
              minWidth: '200px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
          >
            <option value="all">⭐ Toutes les raretés</option>
            {rarityOptions.map(rarity => (
              <option key={rarity} value={rarity}>{rarity}</option>
            ))}
          </select>
        </div>
      </AnimatedSection>

      {/* Statistiques des filtres */}
      <AnimatedSection animation="fadeIn" delay={0.3}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginBottom: '32px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: '16px 24px',
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#06b6d4' }}>
              {cards.length}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Total</div>
          </div>
          
          <div style={{ 
            textAlign: 'center',
            padding: '16px 24px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
              {filteredCards.length}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Résultats</div>
          </div>
          
          <div style={{ 
            textAlign: 'center',
            padding: '16px 24px',
            background: 'rgba(139, 92, 246, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>
              {rarityOptions.length}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Raretés</div>
          </div>
        </div>
      </AnimatedSection>

      {/* Grille des cartes */}
      {filteredCards.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
            Aucune carte trouvée
          </div>
          <div style={{ fontSize: '1rem' }}>
            Essayez de modifier vos critères de recherche
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '24px',
          padding: '0'
        }}>
          {filteredCards.map(card => (
            <div key={card.id} style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <HoloCard 
                card={{ 
                  id: card.id, 
                  name: card.name, 
                  number: String(card.number ?? ''), 
                  rarity: card.rarity, 
                  imagesSmall: getCardImageUrl(card),
                  setSeries: card.setSeries,
                  setCode: String(id || '').toLowerCase()
                }}
                foilMap={foilMap}
              />
              
              {/* Informations de la carte */}
              <div style={{ 
                textAlign: 'center',
                width: '100%',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: 'white'
                }}>
                  {card.name}
                </h3>
                
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ color: '#94a3b8' }}>
                    #{card.number}
                  </span>
                  {card.rarity && (
                    <span style={{ 
                      color: '#fde047',
                      fontWeight: '500',
                      padding: '4px 8px',
                      background: 'rgba(253, 224, 71, 0.1)',
                      borderRadius: '8px'
                    }}>
                      {card.rarity}
                    </span>
                  )}
                </div>
                
                {/* Statistiques de la carte */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-around',
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#06b6d4' }}>
                      {Math.floor(Math.random() * 100) + 1}
                    </div>
                    <div>Attaque</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#22c55e' }}>
                      {Math.floor(Math.random() * 100) + 1}
                    </div>
                    <div>Défense</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#f59e0b' }}>
                      {Math.floor(Math.random() * 100) + 1}
                    </div>
                    <div>Vitesse</div>
                  </div>
                </div>
                
                {/* Informations du set */}
                <div style={{ 
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ color: '#8b5cf6' }}>📚</span> Série {id}
                  </div>
                  <div>
                    <span style={{ color: '#fde047' }}>🎴</span> Carte #{card.number}
                  </div>
                </div>
                
                {/* Actions */}
                <div style={{ 
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  <button style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    background: 'rgba(6, 182, 212, 0.2)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    color: '#06b6d4',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    📖 Détails
                  </button>
                  <button style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    color: '#22c55e',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    💰 Échanger
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
