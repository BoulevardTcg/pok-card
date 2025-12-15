import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AnimatedSection } from './components/AnimatedSection'
import { AnimatedGrid } from './components/AnimatedGrid'

type Set = { 
  id: string; 
  name: string; 
  series?: string | null; 
  imagesLogo?: string | null; 
  imagesSymbol?: string | null; 
  releaseDate?: string | null 
}

function ensurePng(url?: string | null): string | null {
  if (!url) return null
  return url.endsWith('.png') ? url : `${url}.png`
}

export function TradePage() {
  const [sets, setSets] = useState<Set[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeries, setSelectedSeries] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    fetch('http://localhost:8080/api/trade/sets')
      .then(r => r.json())
      .then((data: any[]) => {
        // Les données sont déjà filtrées par le backend
        const mapped: Set[] = data.map(s => ({
          id: s.id,
          name: s.name,
          series: s.series,
          imagesLogo: ensurePng(s.imagesLogo),
          imagesSymbol: ensurePng(s.imagesSymbol),
          releaseDate: s.releaseDate ?? null,
        }))
        setSets(mapped)
        console.log(`🎯 ${mapped.length} séries chargées (déjà filtrées par le backend)`)
      })
      .catch(error => {
        console.error('Erreur lors du chargement des séries:', error)
        setSets([])
      })
      .finally(() => setLoading(false))
  }, [])

  // Filtrer les sets selon la recherche et la série
  const filteredSets = sets.filter(set => {
    const matchesSearch = set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (set.series && set.series.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesSeries = selectedSeries === 'all' || set.series === selectedSeries
    return matchesSearch && matchesSeries
  })

  // Obtenir toutes les séries uniques
  const allSeries = Array.from(new Set(sets.map(set => set.series).filter(Boolean)))

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
          Chargement des séries Pokémon...
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
      {/* Header avec titre et recherche */}
      <AnimatedSection animation="fadeUp" delay={0.1}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 48,
          padding: '32px 0'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            marginBottom: 16,
            background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Échanges Pokémon
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#94a3b8',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Découvrez et échangez des cartes de toutes les séries Pokémon
          </p>
          <div style={{ 
            marginTop: '16px',
            padding: '8px 16px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            fontSize: '0.9rem',
            color: '#06b6d4'
          }}>
            🎯 {filteredSets.length} séries disponibles avec images
          </div>
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
              placeholder="🔍 Rechercher une série ou extension..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
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
            <option value="all">📚 Toutes les séries</option>
            {allSeries.map(series => (
              <option key={series} value={series}>{series}</option>
            ))}
          </select>
        </div>
      </AnimatedSection>

      {/* Statistiques */}
      <AnimatedSection animation="fadeIn" delay={0.3}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '40px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#06b6d4' }}>
              {sets.length}
            </div>
            <div style={{ color: '#94a3b8' }}>Extensions</div>
          </div>
          

          
          <div style={{ 
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>
              {filteredSets.length}
            </div>
            <div style={{ color: '#94a3b8' }}>Résultats</div>
          </div>
        </div>
      </AnimatedSection>

      {/* Grille des extensions */}
      <AnimatedSection animation="fadeUp" delay={0.4}>
        {filteredSets.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
            <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>
              Aucune extension trouvée
            </div>
            <div style={{ fontSize: '1rem' }}>
              Essayez de modifier vos critères de recherche
            </div>
          </div>
        ) : (
          <AnimatedGrid 
            className="sets-grid" 
            staggerDelay={0.05}
            duration={0.5}
          >
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '24px',
              padding: '0'
            }}>
              {filteredSets.map((set, index) => (
                <motion.div
                  key={set.id}
                  whileHover={{ 
                    scale: 1.02,
                    y: -8,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{ 
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => navigate(`/trade/set/${set.id}`)}
                >
                  {/* Effet de brillance au survol */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                    transition: 'left 0.5s ease'
                  }} />
                  
                  {/* Image du logo */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '20px',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {set.imagesLogo ? (
                      <img 
                        src={set.imagesLogo} 
                        alt={set.name} 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '120px', 
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                        }} 
                      />
                    ) : set.imagesSymbol ? (
                      <img 
                        src={set.imagesSymbol} 
                        alt={set.name} 
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                        }} 
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', 
                        height: '120px', 
                        display: 'grid', 
                        placeItems: 'center', 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        color: '#94a3b8',
                        borderRadius: '12px',
                        border: '2px dashed rgba(255, 255, 255, 0.2)'
                      }}>
                        🎴
                      </div>
                    )}
                  </div>

                  {/* Informations de l'extension */}
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: 'white',
                      lineHeight: '1.3'
                    }}>
                      {set.name}
                    </h3>
                    
                    {set.series && (
                      <div style={{ 
                        color: '#06b6d4', 
                        fontSize: '0.9rem',
                        marginBottom: '8px',
                        fontWeight: '500'
                      }}>
                        📚 {set.series}
                      </div>
                    )}
                    
                    {set.releaseDate && (
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: '0.8rem',
                        fontStyle: 'italic'
                      }}>
                        📅 {new Date(set.releaseDate).getFullYear()}
                      </div>
                    )}
                  </div>

                  {/* Indicateur de clic */}
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    color: '#06b6d4',
                    fontSize: '1.2rem',
                    opacity: 0.7
                  }}>
                    →
          </div>
                </motion.div>
        ))}
      </div>
          </AnimatedGrid>
        )}
      </AnimatedSection>
    </div>
  )
}


