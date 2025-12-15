import { useState } from 'react';
import styles from './NewsPage.module.css';

interface NewsItem {
  id: string;
  title: string;
  category: 'Pokémon' | 'One Piece';
  date: string;
  image: string;
  excerpt: string;
  content: string;
  type: 'latest' | 'upcoming';
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Nouvelle extension Pokémon : Obsidienne Ardente',
    category: 'Pokémon',
    date: '2024-01-15',
    image: '/actualiter/pokemon.png',
    excerpt: 'Découvrez les nouvelles cartes ultra-rares de la dernière extension Pokémon avec des illustrations exclusives.',
    content: 'L\'extension Obsidienne Ardente apporte une collection exceptionnelle de cartes Pokémon avec des illustrations exclusives créées par des artistes renommés. Cette extension comprend plus de 200 nouvelles cartes, incluant des cartes ultra-rares, des cartes holographiques et des cartes signature. Les collectionneurs pourront découvrir de nouveaux Pokémon légendaires et des mécaniques de jeu innovantes.',
    type: 'latest',
  },
  {
    id: '2',
    title: 'One Piece Card Game : Extension Grand Line',
    category: 'One Piece',
    date: '2024-01-10',
    image: '/actualiter/one_piece.png',
    excerpt: 'La nouvelle extension One Piece arrive avec des cartes de personnages emblématiques et des effets de jeu inédits.',
    content: 'L\'extension Grand Line marque un tournant dans le One Piece Card Game avec l\'introduction de nouveaux personnages emblématiques de la série. Cette extension comprend des cartes de Luffy, Zoro, Nami et bien d\'autres avec des illustrations exclusives. De nouvelles mécaniques de jeu permettent des stratégies plus complexes et des combats plus intenses.',
    type: 'latest',
  },
  {
    id: '3',
    title: 'Prochaine sortie : Pokémon Écarlate et Violet',
    category: 'Pokémon',
    date: '2024-02-01',
    image: 'https://images.unsplash.com/photo-1608198399988-3414a3e7bafb?w=800&h=600&fit=crop',
    excerpt: 'Préparez-vous pour la sortie de la nouvelle extension basée sur les jeux Écarlate et Violet.',
    content: 'L\'extension Pokémon Écarlate et Violet s\'inspire directement des derniers jeux de la série principale. Les collectionneurs pourront retrouver les nouveaux Pokémon de la région de Paldea, incluant les starters Floragato, Crocalibur et Coiffeton. Cette extension introduit également de nouvelles cartes VMAX et des cartes spéciales avec des effets uniques.',
    type: 'upcoming',
  },
  {
    id: '4',
    title: 'One Piece : Arc Wano - Sortie prévue',
    category: 'One Piece',
    date: '2024-02-15',
    image: 'https://images.unsplash.com/photo-1608198399988-3414a3e7bafb?w=800&h=600&fit=crop',
    excerpt: 'L\'arc Wano arrive dans le Card Game avec de nouvelles mécaniques de jeu et des cartes collector.',
    content: 'L\'arc Wano, l\'un des arcs les plus épiques de One Piece, arrive enfin dans le Card Game. Cette extension comprend des cartes des personnages clés de l\'arc, incluant les neuf Akazaya, Kaido et Big Mom. De nouvelles mécaniques de jeu permettent de recréer les combats épiques de l\'arc, avec des effets spéciaux uniques pour chaque personnage.',
    type: 'upcoming',
  },
  {
    id: '5',
    title: 'Tournoi Pokémon National 2024',
    category: 'Pokémon',
    date: '2024-03-01',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop',
    excerpt: 'Inscrivez-vous dès maintenant pour le tournoi national Pokémon 2024 avec des prix exclusifs.',
    content: 'Le tournoi national Pokémon 2024 se déroulera du 15 au 17 mars à Paris. Les participants pourront concourir dans différentes catégories et gagner des prix exclusifs, incluant des cartes promo rares, des produits collector et des invitations aux championnats internationaux. Les inscriptions sont ouvertes jusqu\'au 1er mars.',
    type: 'latest',
  },
  {
    id: '6',
    title: 'One Piece : Nouvelle série de cartes premium',
    category: 'One Piece',
    date: '2024-03-10',
    image: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop',
    excerpt: 'Une nouvelle série de cartes premium One Piece avec des illustrations exclusives d\'artistes japonais.',
    content: 'Une série limitée de cartes premium One Piece sera disponible en précommande à partir du 10 mars. Ces cartes présentent des illustrations exclusives créées par des artistes japonais renommés, avec des finitions spéciales et des effets holographiques uniques. Chaque carte est numérotée et accompagnée d\'un certificat d\'authenticité.',
    type: 'upcoming',
  },
];

export function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Pokémon' | 'One Piece'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'latest' | 'upcoming'>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const filteredNews = mockNews.filter(news => {
    if (selectedCategory !== 'all' && news.category !== selectedCategory) return false;
    if (selectedType !== 'all' && news.type !== selectedType) return false;
    return true;
  });

  const handleNewsClick = (news: NewsItem) => {
    setSelectedNews(news);
  };

  const handleBackToList = () => {
    setSelectedNews(null);
  };

  if (selectedNews) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <button onClick={handleBackToList} className={styles.backButton}>
            ← Retour aux actualités
          </button>
          <article className={styles.newsDetail}>
            <div className={styles.newsDetailHeader}>
              <div className={styles.newsDetailBadges}>
                <span className={styles.badgeCategory}>{selectedNews.category}</span>
                <span className={styles.badgeType}>
                  {selectedNews.type === 'latest' ? 'Dernière sortie' : 'Prochaine sortie'}
                </span>
                <span className={styles.badgeDate}>
                  {new Date(selectedNews.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h1 className={styles.newsDetailTitle}>{selectedNews.title}</h1>
            </div>
            <div className={styles.newsDetailImageContainer}>
              <img src={selectedNews.image} alt={selectedNews.title} className={styles.newsDetailImage} />
            </div>
            <div className={styles.newsDetailContent}>
              <p className={styles.newsDetailText}>{selectedNews.content}</p>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Actualités</h1>
          <div className={styles.divider}></div>
          <p className={styles.description}>
            Restez informé des dernières sorties et des prochaines nouveautés Pokémon et One Piece
          </p>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Catégorie :</label>
            <div className={styles.filterButtons}>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`${styles.filterButton} ${selectedCategory === 'all' ? styles.active : ''}`}
              >
                Toutes
              </button>
              <button
                onClick={() => setSelectedCategory('Pokémon')}
                className={`${styles.filterButton} ${selectedCategory === 'Pokémon' ? styles.active : ''}`}
              >
                Pokémon
              </button>
              <button
                onClick={() => setSelectedCategory('One Piece')}
                className={`${styles.filterButton} ${selectedCategory === 'One Piece' ? styles.active : ''}`}
              >
                One Piece
              </button>
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type :</label>
            <div className={styles.filterButtons}>
              <button
                onClick={() => setSelectedType('all')}
                className={`${styles.filterButton} ${selectedType === 'all' ? styles.active : ''}`}
              >
                Tous
              </button>
              <button
                onClick={() => setSelectedType('latest')}
                className={`${styles.filterButton} ${selectedType === 'latest' ? styles.active : ''}`}
              >
                Dernières sorties
              </button>
              <button
                onClick={() => setSelectedType('upcoming')}
                className={`${styles.filterButton} ${selectedType === 'upcoming' ? styles.active : ''}`}
              >
                Prochaines sorties
              </button>
            </div>
          </div>
        </div>

        {filteredNews.length > 0 ? (
          <div className={styles.newsGrid}>
            {filteredNews.map((news) => (
              <article
                key={news.id}
                className={styles.newsCard}
                onClick={() => handleNewsClick(news)}
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
                  <div className={styles.newsTypeBadge}>
                    {news.type === 'latest' ? '🆕 Dernière sortie' : '📅 Prochaine sortie'}
                  </div>
                  <h3 className={styles.newsTitle}>{news.title}</h3>
                  <p className={styles.newsExcerpt}>{news.excerpt}</p>
                  <button className={styles.readMoreButton}>
                    Lire la suite
                    <span className={styles.arrow}>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.noNews}>
            <p>Aucune actualité trouvée avec ces filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}

