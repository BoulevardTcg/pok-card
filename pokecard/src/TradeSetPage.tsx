import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import HoloCard from './HoloCard';
import { loadFoilMap } from './foilMap';
import { API_BASE } from './api';
import styles from './TradeSetPage.module.css';

function getCardImageUrl(card: any, quality: 'low' | 'high' = 'high') {
  return quality === 'high' ? card.imagesLarge || undefined : card.imagesSmall || undefined;
}

export function TradeSetPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [foilMap, setFoilMap] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    if (!id) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    Promise.all([
      fetch(`${API_BASE}/trade/sets/${encodeURIComponent(id)}/cards`)
        .then((r) => r.json())

        .then((data: any) => (Array.isArray(data) ? data : []))
        .catch((error) => {
          console.error('Erreur lors du chargement des cartes:', error);
          return [];
        }),
      loadFoilMap().catch(() => new Map()),
    ]).then(([cardsData, foilMapData]) => {
      setCards(cardsData);
      setFoilMap(foilMapData);
      setLoading(false);
    });
  }, [id]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRarity = selectedRarity === 'all' || card.rarity === selectedRarity;
      return matchesSearch && matchesRarity;
    });
  }, [cards, searchQuery, selectedRarity]);

  const rarityOptions = useMemo(() => {
    return Array.from(new Set(cards.map((card) => card.rarity).filter(Boolean)));
  }, [cards]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingIcon}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </div>
            <p>Chargement des cartes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
          <button onClick={() => navigate('/trade')} className={styles.backButton}>
            ← Retour aux échanges
          </button>

          <h1 className={styles.title}>Série {id}</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>{cards.length} cartes disponibles</p>
        </motion.div>

        {/* Barre de recherche et filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={styles.filtersSection}
        >
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Rechercher un Pokémon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Toutes les raretés</option>
            {rarityOptions.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Statistiques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={styles.statsSection}
        >
          <div className={styles.statCard}>
            <div className={styles.statValue}>{cards.length}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{filteredCards.length}</div>
            <div className={styles.statLabel}>Résultats</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{rarityOptions.length}</div>
            <div className={styles.statLabel}>Raretés</div>
          </div>
        </motion.div>

        {/* Grille des cartes */}
        {filteredCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={styles.emptyState}
          >
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>Aucune carte trouvée</h3>
            <p className={styles.emptyText}>Essayez de modifier vos critères de recherche</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={styles.cardsGrid}
          >
            {filteredCards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={styles.cardWrapper}
              >
                <div className={styles.cardContainer}>
                  <HoloCard
                    card={{
                      id: card.id,
                      name: card.name,
                      number: String(card.number ?? ''),
                      rarity: card.rarity,
                      imagesSmall: getCardImageUrl(card),
                      setSeries: card.setSeries,
                      setCode: String(id || '').toLowerCase(),
                    }}
                    foilMap={foilMap}
                  />
                </div>

                <div className={styles.cardInfo}>
                  <h3 className={styles.cardName}>{card.name}</h3>

                  <div className={styles.cardMeta}>
                    <span className={styles.cardNumber}>#{card.number}</span>
                    {card.rarity && <span className={styles.cardRarity}>{card.rarity}</span>}
                  </div>

                  <div className={styles.cardActions}>
                    <button className={styles.detailsButton}>📖 Détails</button>
                    <button className={styles.tradeButton}>💰 Échanger</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
