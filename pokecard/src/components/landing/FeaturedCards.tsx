import { useNavigate } from 'react-router-dom';
import { TrendingUpIcon, ArrowUpRightIcon } from '../icons/Icons';
import styles from './FeaturedCards.module.css';

type ProductType = 'card' | 'sealed';

interface FeaturedItem {
  id: string;
  type: ProductType;
  name: string;
  subtitle: string;
  universe: 'Pokémon' | 'One Piece' | 'Yu-Gi-Oh' | 'Autre';
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  // Pour les cartes gradées
  grade?: string;
  gradeProvider?: 'PSA' | 'CGC' | 'BGS';
  // Pour les produits scellés
  productType?: string;
  inStock?: boolean;
}

// Mix de cartes gradées ET produits scellés
const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: '1',
    type: 'card',
    name: 'Dracaufeu VMAX',
    subtitle: 'Ténèbres Embrasées',
    universe: 'Pokémon',
    price: 2450,
    image: '/carte_accueil/card01.png',
    badge: 'Investissement',
    grade: '10',
    gradeProvider: 'PSA',
  },
  {
    id: '2',
    type: 'sealed',
    name: 'Display OP-09',
    subtitle: 'One Piece TCG',
    universe: 'One Piece',
    price: 129,
    originalPrice: 145,
    image: '/img/products/Display-OP09.png',
    badge: 'Nouveauté',
    productType: 'Display 24 boosters',
    inStock: true,
  },
  {
    id: '3',
    type: 'sealed',
    name: 'ETB Méga-Évolution',
    subtitle: 'Coffret Dresseur d\'Élite',
    universe: 'Pokémon',
    price: 59,
    image: '/img/products/ETB-MegaEvolution-Gardevoir.jpg',
    badge: 'Précommande',
    productType: 'Elite Trainer Box',
    inStock: true,
  },
  {
    id: '4',
    type: 'card',
    name: 'Pikachu VMAX',
    subtitle: 'Rainbow Rare',
    universe: 'Pokémon',
    price: 890,
    image: '/carte_accueil/card02.png',
    grade: '10',
    gradeProvider: 'CGC',
  },
];

export default function FeaturedCards() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.overline}>À la une</span>
            <h2 className={styles.title}>Pépites du moment</h2>
            <p className={styles.description}>
              Cartes de collection, boosters à ouvrir, coffrets à s'offrir — 
              notre sélection pour tous les passionnés.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/produits')}
            className={styles.viewAllButton}
          >
            <span>Voir tout le catalogue</span>
            <ArrowUpRightIcon size={16} />
          </button>
        </div>

        {/* Items Grid */}
        <div className={styles.itemsGrid}>
          {FEATURED_ITEMS.map((item) => (
            <article
              key={item.id}
              className={styles.card}
              onClick={() => navigate(`/produit/${item.id}`)}
            >
              {/* Image */}
              <div className={styles.cardImageWrapper}>
                <img
                  src={item.image}
                  alt={item.name}
                  className={styles.cardImage}
                />
                <div className={styles.cardImageOverlay} />
                
                {/* Badge */}
                {item.badge && (
                  <div className={`${styles.badge} ${styles[item.badge.toLowerCase().replace(' ', '')]}`}>
                    {item.badge}
                  </div>
                )}

                {/* Grade Badge (pour les cartes) */}
                {item.type === 'card' && item.grade && (
                  <div className={styles.gradeBadge}>
                    <span className={styles.gradeProvider}>{item.gradeProvider}</span>
                    <span className={styles.gradeValue}>{item.grade}</span>
                  </div>
                )}

                {/* Stock indicator (pour les sealed) */}
                {item.type === 'sealed' && item.inStock && (
                  <div className={styles.stockBadge}>
                    <span className={styles.stockDot} />
                    En stock
                  </div>
                )}
              </div>

              {/* Content */}
              <div className={styles.cardContent}>
                {/* Info */}
                <div className={styles.cardInfo}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardUniverse}>{item.universe}</span>
                    {item.type === 'sealed' && item.productType && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.cardType}>{item.productType}</span>
                      </>
                    )}
                  </div>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  <span className={styles.cardSubtitle}>{item.subtitle}</span>
                </div>

                {/* Price */}
                <div className={styles.cardPricing}>
                  <div className={styles.priceRow}>
                    <span className={styles.priceValue}>
                      {item.price.toLocaleString('fr-FR')} €
                    </span>
                    {item.originalPrice && (
                      <span className={styles.originalPrice}>
                        {item.originalPrice.toLocaleString('fr-FR')} €
                      </span>
                    )}
                  </div>
                  
                  {item.type === 'card' && (
                    <div className={styles.investmentHint}>
                      <TrendingUpIcon size={14} />
                      <span>Valeur en hausse</span>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
