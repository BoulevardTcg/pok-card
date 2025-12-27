/**
 * @deprecated Ce composant est déprécié dans la landing page.
 * Les actualités sont maintenant accessibles via la page /actualites.
 * Ce fichier peut être supprimé de la landing lors du prochain nettoyage.
 */

import { useNavigate } from 'react-router-dom';
import styles from './NewsSection.module.css';

interface NewsItem {
  id: string;
  title: string;
  category: 'Pokémon' | 'One Piece';
  date: string;
  image: string;
  excerpt: string;
  type: 'latest' | 'upcoming';
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Nouvelle extension Pokémon : Obsidienne Ardente',
    category: 'Pokémon',
    date: '2024-01-15',
    image: '/actualiter/pokemon.png',
    excerpt:
      'Découvrez les nouvelles cartes ultra-rares de la dernière extension Pokémon avec des illustrations exclusives.',
    type: 'latest',
  },
  {
    id: '2',
    title: 'One Piece Card Game : Extension Grand Line',
    category: 'One Piece',
    date: '2024-01-10',
    image: '/actualiter/one_piece.png',
    excerpt:
      'La nouvelle extension One Piece arrive avec des cartes de personnages emblématiques et des effets de jeu inédits.',
    type: 'latest',
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
            <h2 className={styles.title}>Actualités</h2>
            <div className={styles.divider}></div>
            <p className={styles.description}>
              Restez informé des dernières sorties et des prochaines nouveautés Pokémon et One Piece
            </p>
          </div>
          <button onClick={() => navigate('/actualites')} className={styles.seeAllButton}>
            Voir toutes les actualités
            <span className={styles.arrow}>→</span>
          </button>
        </div>

        <div className={styles.newsGrid}>
          {latestNews.map((news) => (
            <article
              key={news.id}
              className={styles.newsCard}
              onClick={() => navigate('/actualites')}
            >
              <div className={styles.newsImageContainer}>
                <img src={news.image} alt={news.title} className={styles.newsImage} />
                <div className={styles.newsBadge}>
                  <span className={styles.badgeCategory}>{news.category}</span>
                  <span className={styles.badgeDate}>
                    {new Date(news.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className={styles.newsContent}>
                <div className={styles.newsTypeBadge}>🆕 Dernière sortie</div>
                <h4 className={styles.newsTitle}>{news.title}</h4>
                <p className={styles.newsExcerpt}>{news.excerpt}</p>
                <button className={styles.readMoreButton}>
                  Lire la suite
                  <span className={styles.arrow}>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
