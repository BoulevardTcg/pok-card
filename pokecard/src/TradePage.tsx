import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Seo } from './components/Seo';
import { m } from 'framer-motion';
import { API_BASE } from './api';
import { handleImageError } from './utils/imageFallback';
import styles from './TradePage.module.css';

type Set = {
  id: string;
  name: string;
  series?: string | null;
  imagesLogo?: string | null;
  imagesSymbol?: string | null;
  releaseDate?: string | null;
};

function ensurePng(url?: string | null): string | null {
  if (!url) return null;
  return url.endsWith('.png') ? url : `${url}.png`;
}

export function TradePage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/trade/sets`)
      .then((r) => r.json())
      .then((data: any[]) => {
        const mapped: Set[] = data.map((s) => ({
          id: s.id,
          name: s.name,
          series: s.series,
          imagesLogo: ensurePng(s.imagesLogo),
          imagesSymbol: ensurePng(s.imagesSymbol),
          releaseDate: s.releaseDate ?? null,
        }));
        setSets(mapped);
      })
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, []);

  // Normaliser la chaîne pour la recherche (supprimer les accents et mettre en minuscule)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const filteredSets = useMemo(() => {
    if (!searchQuery && selectedSeries === 'all') {
      return sets;
    }

    const normalizedQuery = normalizeString(searchQuery);

    return sets.filter((set) => {
      const matchesSearch =
        !normalizedQuery ||
        normalizeString(set.name).includes(normalizedQuery) ||
        (set.series && normalizeString(set.series).includes(normalizedQuery));
      const matchesSeries = selectedSeries === 'all' || set.series === selectedSeries;
      return matchesSearch && matchesSeries;
    });
  }, [sets, searchQuery, selectedSeries]);

  const allSeries = useMemo(() => {
    return Array.from(new Set(sets.map((set) => set.series).filter(Boolean)));
  }, [sets]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.loadingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Chargement des séries...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Seo
        title="Échange de cartes"
        description="Échangez vos cartes à collectionner entre passionnés sur BoulevardTCG. Fonctionnalité en cours de développement."
        canonical="/trade"
      />
      <div className={styles.container}>
        {/* Panneau d'avertissement - En construction */}
        <div className={styles.constructionBanner}>
          <div className={styles.constructionContent}>
            <span className={styles.constructionIcon}>🚧</span>
            <div className={styles.constructionText}>
              <strong>Section en construction</strong>
              <p>
                Cette fonctionnalité d'échange de cartes est actuellement en développement. Elle
                sera bientôt disponible !
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
          <h1 className={styles.title}>Échanges de Cartes</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>
            Découvrez et échangez des cartes de toutes les séries Pokémon et One Piece
          </p>
        </m.div>

        {/* Barre de recherche et filtres */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={styles.filtersSection}
        >
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Rechercher une série ou extension..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Toutes les séries</option>
            {allSeries.map((series) => (
              <option key={series} value={series}>
                {series}
              </option>
            ))}
          </select>
        </m.div>

        {/* Statistiques */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={styles.statsSection}
        >
          <div className={styles.statCard}>
            <div className={styles.statValue}>{sets.length}</div>
            <div className={styles.statLabel}>Extensions</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{filteredSets.length}</div>
            <div className={styles.statLabel}>Résultats</div>
          </div>
        </m.div>

        {/* Grille des extensions */}
        {filteredSets.length === 0 ? (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={styles.emptyState}
          >
            <div className={styles.emptyIcon}>🔍</div>
            <h3 className={styles.emptyTitle}>Aucune extension trouvée</h3>
            <p className={styles.emptyText}>Essayez de modifier vos critères de recherche</p>
          </m.div>
        ) : (
          <div className={styles.setsGrid}>
            {filteredSets.map((set) => (
              <m.div
                key={set.id}
                initial={false}
                animate={{ opacity: 1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={styles.setCard}
                onClick={() => navigate(`/trade/set/${set.id}`)}
              >
                <div className={styles.setImageContainer}>
                  {set.imagesLogo ? (
                    <img
                      src={set.imagesLogo}
                      alt={set.name}
                      className={styles.setImage}
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                    />
                  ) : set.imagesSymbol ? (
                    <img
                      src={set.imagesSymbol}
                      alt={set.name}
                      className={styles.setSymbol}
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>🎴</div>
                  )}
                </div>

                <div className={styles.setInfo}>
                  <h3 className={styles.setName}>{set.name}</h3>

                  {set.series && <div className={styles.setSeries}>📚 {set.series}</div>}

                  {set.releaseDate && (
                    <div className={styles.setDate}>
                      📅 {new Date(set.releaseDate).getFullYear()}
                    </div>
                  )}

                  <div className={styles.setArrow}>→</div>
                </div>
              </m.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
