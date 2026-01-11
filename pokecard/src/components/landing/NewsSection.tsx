/**
 * @deprecated Ce composant est déprécié dans la landing page.
 * Les actualités sont maintenant accessibles via la page /actualites.
 * Ce fichier peut être supprimé de la landing lors du prochain nettoyage.
 */

import { useNavigate } from 'react-router-dom';
import styles from './NewsSection.module.css';

type TCGCategory =
  | 'Pokémon'
  | 'One Piece'
  | 'Disney Lorcana'
  | 'Magic'
  | 'Yu-Gi-Oh!'
  | 'Flesh and Blood'
  | 'Riftbound';

interface NewsItem {
  id: string;
  title: string;
  category: TCGCategory;
  date: string;
  image: string;
  excerpt: string;
  type: 'latest' | 'upcoming';
}

const categoryColors: Record<TCGCategory, { bg: string; text: string }> = {
  Pokémon: { bg: 'rgba(255, 203, 5, 0.15)', text: '#FFCB05' },
  'One Piece': { bg: 'rgba(220, 38, 38, 0.15)', text: '#ef4444' },
  'Disney Lorcana': { bg: 'rgba(139, 92, 246, 0.15)', text: '#a78bfa' },
  Magic: { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c' },
  'Yu-Gi-Oh!': { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
  'Flesh and Blood': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
  Riftbound: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8' },
};

const mockNews: NewsItem[] = [
  {
    id: 'pkmn-1',
    title: 'Pokémon TCG — Mega Evolution : Ascended Heroes',
    category: 'Pokémon',
    date: '2026-01-30',
    image: '/actualiter/pokemon.png',
    excerpt:
      'Grosse extension annoncée avec 290+ cartes, nouvelles cartes et stratégies autour de la Mega Evolution.',
    type: 'upcoming',
  },
  {
    id: 'op-1',
    title: "One Piece Card Game — THE AZURE SEA'S SEVEN [OP14-EB04]",
    category: 'One Piece',
    date: '2026-01-16',
    image: '/actualiter/one_piece.png',
    excerpt:
      'Nouveau booster pack mettant en avant les Seven Warlords of the Sea avec de nouveaux Leaders.',
    type: 'upcoming',
  },
];

export default function NewsSection() {
  const navigate = useNavigate();

  // Afficher seulement les 2 dernières actualités
  const latestNews = mockNews.slice(0, 2);

  return (
    <div className={styles.newsSection}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <div className={styles.headerBadge}>
              <span className={styles.badgeDot}></span>
              Actualités TCG
            </div>
            <h2 className={styles.title}>Actualités</h2>
            <div className={styles.divider}></div>
            <p className={styles.description}>
              Restez informé des dernières sorties et des prochaines nouveautés TCG
            </p>
          </div>
          <button onClick={() => navigate('/actualites')} className={styles.seeAllButton}>
            Voir toutes les actualités
            <span className={styles.arrow}>→</span>
          </button>
        </div>

        <div className={styles.newsGrid}>
          {latestNews.map((news) => {
            const colors = categoryColors[news.category];
            return (
              <article
                key={news.id}
                className={styles.newsCard}
                onClick={() => navigate('/actualites')}
              >
                <div className={styles.newsImageContainer}>
                  <img src={news.image} alt={news.title} className={styles.newsImage} />
                  <div className={styles.imageOverlay}></div>
                  <div className={styles.newsBadge}>
                    <span
                      className={styles.badgeCategory}
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {news.category}
                    </span>
                    <span className={styles.badgeDate}>
                      {new Date(news.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.newsContent}>
                  <div className={styles.newsTypeBadge} data-type={news.type}>
                    {news.type === 'latest' ? '✓ Disponible' : '📅 À venir'}
                  </div>
                  <h4 className={styles.newsTitle}>{news.title}</h4>
                  <p className={styles.newsExcerpt}>{news.excerpt}</p>
                  <button className={styles.readMoreButton}>
                    Lire la suite
                    <span className={styles.arrow}>→</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
