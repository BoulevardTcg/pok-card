import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';
import Footer from './Footer';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  license: string;
  stock: number;
  isNew?: boolean;
  isPreorder?: boolean;
}

interface HomeProps {
  search: string;
}

// Données pour les différentes catégories
const popularCards: Product[] = [
  {
    id: 1,
    name: "Charizard VMAX",
    price: 89.99,
    originalPrice: 129.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 15,
    isNew: true
  },
  {
    id: 2,
    name: "Pikachu V",
    price: 24.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 42
  },
  {
    id: 3,
    name: "Luffy Gear 5",
    price: 34.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 28
  },
  {
    id: 4,
    name: "Goku Ultra Instinct",
    price: 44.99,
    image: "/public/img/ancient.png",
    license: "Dragon Ball",
    stock: 19
  },
  {
    id: 5,
    name: "Mewtwo V",
    price: 39.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 31
  },
  {
    id: 6,
    name: "Zoro Roronoa",
    price: 29.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 25
  }
];

const preorders: Product[] = [
  {
    id: 7,
    name: "Scarlet & Violet 151",
    price: 149.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 0,
    isPreorder: true
  },
  {
    id: 8,
    name: "One Piece TCG Set 2",
    price: 89.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 0,
    isPreorder: true
  },
  {
    id: 9,
    name: "Dragon Ball Super Set 3",
    price: 79.99,
    image: "/public/img/ancient.png",
    license: "Dragon Ball",
    stock: 0,
    isPreorder: true
  },
  {
    id: 10,
    name: "Pokémon 151 Elite Trainer Box",
    price: 59.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 0,
    isPreorder: true
  },
  {
    id: 11,
    name: "One Piece Booster Box",
    price: 129.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 0,
    isPreorder: true
  },
  {
    id: 12,
    name: "Dragon Ball Booster Pack",
    price: 4.99,
    image: "/public/img/ancient.png",
    license: "Dragon Ball",
    stock: 0,
    isPreorder: true
  }
];

const bestSellers: Product[] = [
  {
    id: 13,
    name: "Pokémon Booster Pack",
    price: 4.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 156
  },
  {
    id: 14,
    name: "One Piece Starter Deck",
    price: 19.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 89
  },
  {
    id: 15,
    name: "Dragon Ball Super Pack",
    price: 3.99,
    image: "/public/img/ancient.png",
    license: "Dragon Ball",
    stock: 203
  },
  {
    id: 16,
    name: "Pokémon Elite Trainer Box",
    price: 49.99,
    image: "/public/img/ancient.png",
    license: "Pokémon",
    stock: 67
  },
  {
    id: 17,
    name: "One Piece Booster Pack",
    price: 4.99,
    image: "/public/img/ancient.png",
    license: "One Piece",
    stock: 134
  },
  {
    id: 18,
    name: "Dragon Ball Starter Deck",
    price: 24.99,
    image: "/public/img/ancient.png",
    license: "Dragon Ball",
    stock: 78
  }
];

export function Home({ search }: HomeProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refs pour les carrousels
  const popularCarouselRef = useRef<HTMLDivElement>(null);
  const preordersCarouselRef = useRef<HTMLDivElement>(null);
  const bestSellersCarouselRef = useRef<HTMLDivElement>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    
    // Simuler un appel API
    setTimeout(() => {
      alert('Inscription réussie ! Vous recevrez bientôt votre code de réduction de 10%.');
      setEmail('');
      setIsLoading(false);
    }, 1000);
  };

  // Fonction pour filtrer les produits selon la recherche
  const filterProducts = (products: Product[]) => {
    if (!search) return products;
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  };

  // Fonction pour faire défiler les carrousels
  const scrollCarousel = (direction: 'left' | 'right', carouselRef: React.RefObject<HTMLDivElement | null>) => {
    const el = carouselRef.current;
    if (!el) return;

    const card = el.querySelector<HTMLDivElement>(`.${styles.productCard}`);
    const style = getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    const cardWidth = card ? card.getBoundingClientRect().width : 320;

    const amount = cardWidth + gap;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Données des catégories boutique
  const boutiqueCategories = [
    {
      id: 'cards',
      icon: '🃏',
      title: 'CARTES À COLLECTIONNER',
      description: 'Pokémon, One Piece & plus',
      color: 'purple'
    },
    {
      id: 'mangas',
      icon: '📚',
      title: 'MANGAS',
      description: 'Univers liés aux cartes',
      color: 'blue'
    },
    {
      id: 'goodies',
      icon: '🎁',
      title: 'GOODIES',
      description: 'Accessoires & collections',
      color: 'purple'
    },
    {
      id: 'games',
      icon: '🎮',
      title: 'JEUX VIDÉO',
      description: 'TCG en ligne & plus',
      color: 'blue'
    }
  ];

  // Données des espaces expérience
  const experienceSpaces = [
    {
      id: 'milkshakes',
      icon: '🥤',
      title: 'BAR À MILKSHAKES',
      description: 'Espace détente & gourmandise',
      color: 'purple'
    },
    {
      id: 'consoles',
      icon: '🎮',
      title: 'CONSOLES EN LIBRE ACCÈS',
      description: 'Zone gaming & compétition',
      color: 'blue'
    }
  ];

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}>
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
            alt="Cartes TCG Premium"
            className={styles.heroImage}
          />
          <div className={styles.heroOverlay} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              ⭐ Collection Premium
            </div>
            
            <h1 className={styles.heroTitle}>
              L'univers des{" "}
              <span className={styles.heroHighlight}>cartes TCG</span>
              <br />
              de collection
            </h1>
            
            <p className={styles.heroDescription}>
              Découvrez notre sélection premium de cartes Pokémon, One Piece, 
              Dragon Ball et bien plus. Authentiques, certifiées et livrées avec soin.
            </p>

            {/* Features */}
            <div className={styles.heroFeatures}>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>🛡️</div>
                <span>Cartes authentiques</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>⚡</div>
                <span>Livraison rapide</span>
              </div>
              <div className={styles.heroFeature}>
                <div className={styles.featureIcon}>⭐</div>
                <span>Garantie qualité</span>
              </div>
            </div>

            {/* CTAs */}
            <div className={styles.heroCTAs}>
              <button className={styles.heroCTA}>
                Explorer le catalogue
                <span className={styles.ctaArrow}>→</span>
              </button>
              
              <button className={styles.heroCTASecondary}>
                Précommandes exclusives
              </button>
            </div>

            {/* Stats */}
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>5000+</div>
                <div className={styles.statLabel}>Cartes disponibles</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>98%</div>
                <div className={styles.statLabel}>Clients satisfaits</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.statNumber}>24h</div>
                <div className={styles.statLabel}>Livraison express</div>
              </div>
            </div>
          </div>

          {/* Floating cards animation placeholder */}
          <div className={styles.heroVisual}>
            <div className={styles.floatingCards}>
              <div className={styles.floatingCard}></div>
              <div className={styles.floatingCard}></div>
              <div className={styles.floatingCard}></div>
            </div>
          </div>
        </div>
      </section>

      {/* BOUTIQUE */}
      <section className={styles.boutiqueSection}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>BOUTIQUE</h2>
          <div className={styles.boutiqueGrid}>
            {boutiqueCategories.map((category) => (
              <div 
                key={category.id} 
                className={`${styles.boutiqueCard} ${styles[`boutiqueCard${category.color}`]}`}
                onClick={() => navigate(`/${category.id}`)}
              >
                <div className={styles.boutiqueCardIcon}>{category.icon}</div>
                <h3 className={styles.boutiqueCardTitle}>{category.title}</h3>
                <p className={styles.boutiqueCardDescription}>{category.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESPACE EXPÉRIENCE */}
      <section className={styles.experienceSection}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>ESPACE EXPÉRIENCE</h2>
          <div className={styles.experienceGrid}>
            {experienceSpaces.map((space) => (
              <div 
                key={space.id} 
                className={`${styles.experienceCard} ${styles[`experienceCard${space.color}`]}`}
              >
                <div className={styles.experienceCardIcon}>{space.icon}</div>
                <div className={styles.experienceCardContent}>
                  <h3 className={styles.experienceCardTitle}>{space.title}</h3>
                  <p className={styles.experienceCardDescription}>{space.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOUVEAU CTA FINAL */}
      <section className={styles.finalCTASection}>
        <div className={styles.sectionContainer}>
          <button className={styles.finalCTAButton}>
            DÉCOUVRIR LA BOUTIQUE
          </button>
        </div>
      </section>

      {/* Cartes les plus populaires */}
      <section className={styles.categorySection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionBadge}>
              🔥 Tendances
            </div>
            <h2 className={styles.sectionHeading}>
              Cartes les plus populaires
            </h2>
            <p className={styles.sectionDescription}>
              Découvrez les cartes les plus recherchées par la communauté TCG.
            </p>
          </div>
          
          <button className={styles.seeAllButton}>
            Voir toutes les tendances
            <span className={styles.buttonArrow}>→</span>
          </button>
        </div>

        <div className={styles.carouselContainer}>
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('left', popularCarouselRef)}
            aria-label="Défiler vers la gauche"
          >
            <span>‹</span>
          </button>
          
          <div className={styles.carouselTrack} ref={popularCarouselRef}>
            {filterProducts(popularCards).map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImageContainer}>
                  <img src={product.image} alt={product.name} className={styles.productImage} />
                  {product.isNew && <div className={styles.newBadge}>Nouveau</div>}
                </div>
                
                <div className={styles.productInfo}>
                  <div className={styles.productLicense}>{product.license}</div>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>
                    {product.originalPrice && (
                      <span className={styles.originalPrice}>{product.originalPrice}€</span>
                    )}
                    <span className={styles.currentPrice}>{product.price}€</span>
                  </div>
                  <div className={styles.productStock}>
                    Stock: {product.stock} disponible{product.stock > 1 ? 's' : ''}
                  </div>
                  <button className={styles.addToCartButton}>
                    Ajouter au panier
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('right', popularCarouselRef)}
            aria-label="Défiler vers la droite"
          >
            <span>›</span>
          </button>
        </div>
      </section>

      {/* Précommandes */}
      <section className={styles.categorySection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionBadge}>
              ⏰ Précommandes
            </div>
            <h2 className={styles.sectionHeading}>
              Réservez en avant-première
            </h2>
            <p className={styles.sectionDescription}>
              Soyez les premiers à recevoir les nouvelles collections et sets exclusifs.
            </p>
          </div>
          
          <button className={styles.seeAllButton}>
            Voir toutes les précommandes
            <span className={styles.buttonArrow}>→</span>
          </button>
        </div>

        <div className={styles.carouselContainer}>
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('left', preordersCarouselRef)}
            aria-label="Défiler vers la gauche"
          >
            <span>‹</span>
          </button>
          
          <div className={styles.carouselTrack} ref={preordersCarouselRef}>
            {filterProducts(preorders).map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImageContainer}>
                  <img src={product.image} alt={product.name} className={styles.productImage} />
                  <div className={styles.preorderBadge}>Précommande</div>
                </div>
                
                <div className={styles.productInfo}>
                  <div className={styles.productLicense}>{product.license}</div>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>
                    <span className={styles.currentPrice}>{product.price}€</span>
                  </div>
                  <div className={styles.productStock}>
                    Disponible en précommande
                  </div>
                  <button className={styles.addToCartButton}>
                    Réserver maintenant
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('right', preordersCarouselRef)}
            aria-label="Défiler vers la droite"
          >
            <span>›</span>
          </button>
        </div>
      </section>

      {/* Items les plus vendus */}
      <section className={styles.categorySection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.sectionBadge}>
              🏆 Meilleures ventes
            </div>
            <h2 className={styles.sectionHeading}>
              Items les plus vendus
            </h2>
            <p className={styles.sectionDescription}>
              Les produits préférés de nos clients, toujours en stock et prêts à expédier.
            </p>
          </div>
          
          <button className={styles.seeAllButton}>
            Voir tous les best-sellers
            <span className={styles.buttonArrow}>→</span>
          </button>
        </div>

        <div className={styles.carouselContainer}>
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('left', bestSellersCarouselRef)}
            aria-label="Défiler vers la gauche"
          >
            <span>‹</span>
          </button>
          
          <div className={styles.carouselTrack} ref={bestSellersCarouselRef}>
            {filterProducts(bestSellers).map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImageContainer}>
                  <img src={product.image} alt={product.name} className={styles.productImage} />
                </div>
                
                <div className={styles.productInfo}>
                  <div className={styles.productLicense}>{product.license}</div>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <div className={styles.productPrice}>
                    <span className={styles.currentPrice}>{product.price}€</span>
                  </div>
                  <div className={styles.productStock}>
                    Stock: {product.stock} disponible{product.stock > 1 ? 's' : ''}
                  </div>
                  <button className={styles.addToCartButton}>
                    Ajouter au panier
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className={styles.carouselButton} 
            onClick={() => scrollCarousel('right', bestSellersCarouselRef)}
            aria-label="Défiler vers la droite"
          >
            <span>›</span>
          </button>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className={styles.newsletterSection}>
        <div className={styles.newsletterContainer}>
          <div className={styles.newsletterContent}>
            <div className={styles.newsletterHeader}>
              <div className={styles.newsletterBadge}>🎁 Offre exclusive</div>
              
              <h2 className={styles.newsletterTitle}>
                Ne ratez aucune{" "}
                <span className={styles.newsletterHighlight}>nouveauté</span>
              </h2>
              
              <p className={styles.newsletterDescription}>
                Inscrivez-vous à notre newsletter et recevez un code de réduction de 10% 
                ainsi que les dernières actualités TCG en avant-première.
              </p>
            </div>

            {/* Benefits */}
            <div className={styles.newsletterBenefits}>
              <div className={styles.newsletterBenefit}>
                <div className={styles.benefitIcon}>⭐</div>
                <span>Accès prioritaire aux précommandes</span>
              </div>
              
              <div className={styles.newsletterBenefit}>
                <div className={styles.benefitIcon}>⚡</div>
                <span>Promotions exclusives</span>
              </div>
              
              <div className={styles.newsletterBenefit}>
                <div className={styles.benefitIcon}>📧</div>
                <span>News et actualités TCG</span>
              </div>
              
              <div className={styles.newsletterBenefit}>
                <div className={styles.benefitIcon}>🎯</div>
                <span>Concours et giveaways</span>
              </div>
            </div>

            {/* Newsletter form */}
            <form onSubmit={handleNewsletterSubmit} className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.newsletterInput}
                required
              />
              <button 
                type="submit" 
                className={styles.newsletterButton}
                disabled={isLoading}
              >
                {isLoading ? "Inscription..." : "S'inscrire"}
              </button>
            </form>

            <p className={styles.newsletterDisclaimer}>
              En vous inscrivant, vous acceptez de recevoir nos emails marketing. 
              Vous pouvez vous désabonner à tout moment.
            </p>
          </div>

          {/* Visual element */}
          <div className={styles.newsletterVisual}>
            <div className={styles.newsletterCards}>
              <div className={styles.newsletterCard}></div>
              <div className={styles.newsletterCard}></div>
              <div className={styles.newsletterCard}>
                <div className={styles.newsletterCardContent}>
                  <div className={styles.newsletterCardIcon}>📧</div>
                  <p>Newsletter<br />Premium</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
} 