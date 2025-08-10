import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import HoloCard from './HoloCard'
import { loadFoilMap } from './foilMap'

function getCardImageUrl(card: any, quality: 'low' | 'high' = 'high') {
  return quality === 'high' ? card.imagesLarge || undefined : card.imagesSmall || undefined;
}

export function TradeSetPage() {
  const { id } = useParams()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [foilMap, setFoilMap] = useState<Map<string, string> | null>(null)
  // Agrandissement géré par HoloCard maintenant; plus besoin de selectedCard ici

  useEffect(() => {
    if (!id) return
    
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
      <div style={{ padding: 40, textAlign: 'center', width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18 }}>Chargement des cartes…</span>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, width: '100%', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 36, marginBottom: 24, textAlign: 'center' }}>Cartes de la série {id}</h1>

      {/* Filtres */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <input
          type="text"
          placeholder="Rechercher un Pokémon..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: '1 1 200px', padding: 12, borderRadius: 12, border: '1px solid #ccc', fontSize: 16, maxWidth: 400 }}
        />
        <select
          value={selectedRarity}
          onChange={e => setSelectedRarity(e.target.value)}
          style={{ flex: '1 1 150px', padding: 12, borderRadius: 12, border: '1px solid #ccc', fontSize: 16, maxWidth: 200 }}
        >
          <option value="all">Toutes les raretés</option>
          {rarityOptions.map(rarity => (
            <option key={rarity} value={rarity}>{rarity}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
        {filteredCards.map(card => (
          <motion.div
            key={card.id}
            style={{ cursor: 'default' }}
          >
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
          </motion.div>
        ))}
      </div>
    </div>
  )
}
