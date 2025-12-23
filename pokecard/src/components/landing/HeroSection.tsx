import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ArrowRightIcon } from '../icons/Icons';
import styles from './HeroSection.module.css';

// Produits scellés en rotation — représentant différents univers
// Les images de cartes 3D sont utilisées pour l'effet visuel
const HERO_PRODUCTS = [
  {
    id: 1,
    name: 'ETB Flammes Fantasmagoriques',
    subtitle: 'Coffret Dresseur d\'Élite',
    set: 'ME02',
    universe: 'Pokémon',
    image: '/carte_accueil/card01.png',
  },
  {
    id: 2,
    name: 'Display One Piece OP13',
    subtitle: 'Display 24 boosters',
    set: 'OP13',
    universe: 'One Piece',
    image: '/carte_accueil/card02.png',
  },
  {
    id: 3,
    name: 'UPC Flammes Fantasmagoriques',
    subtitle: 'Ultra Premium Collection',
    set: 'ME02',
    universe: 'Pokémon',
    image: '/carte_accueil/card03.png',
  },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);

  const currentProduct = HERO_PRODUCTS[currentProductIndex];

  // Rotation automatique des produits
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentProductIndex((prev) => (prev + 1) % HERO_PRODUCTS.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Effet de parallaxe subtil sur le produit — seulement quand la souris est au-dessus
  useEffect(() => {
    if (!isHovering) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!productRef.current) return;
      
      const rect = productRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) / rect.width;
      const y = (e.clientY - centerY) / rect.height;
      
      setMousePosition({ x: x * 12, y: y * 12 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovering]);

  // Réinitialiser la position quand la souris quitte le produit
  const handleMouseLeave = () => {
    setIsHovering(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <section className={styles.hero}>
      {/* Fond subtil */}
      <div className={styles.heroBackground}>
        <div className={styles.gradientOrb} />
        <div className={styles.noiseOverlay} />
      </div>

      <div className={styles.heroContainer}>
        {/* Contenu textuel */}
        <div className={styles.heroContent}>
          <div className={styles.universeBadge}>
            <span className={styles.universeDot} />
            <span>{currentProduct.universe}</span>
          </div>
          
          <h1 className={styles.title}>
            <span className={styles.titleMain}>Découvrez.</span>
            <span className={styles.titleMain}>Collectionnez.</span>
            <span className={styles.titleAccent}>Vivez votre passion.</span>
          </h1>

          <p className={styles.description}>
            Boosters, displays, coffrets ETB et collections premium — 
            Boulevard vous propose une sélection soignée de produits scellés 
            pour tous les passionnés de TCG.
          </p>

          <div className={styles.heroActions}>
            <button
              onClick={() => navigate('/produits')}
              className={styles.primaryCta}
            >
              <span>Explorer la boutique</span>
              <ArrowRightIcon size={18} />
            </button>
          </div>

          {/* Product indicators */}
          <div className={styles.cardIndicators}>
            {HERO_PRODUCTS.map((product, index) => (
              <button
                key={product.id}
                className={`${styles.indicator} ${index === currentProductIndex ? styles.active : ''}`}
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentProductIndex(index);
                    setIsTransitioning(false);
                  }, 300);
                }}
                aria-label={`Voir ${product.name}`}
              >
                <span className={styles.indicatorProgress} />
              </button>
            ))}
          </div>
        </div>

        {/* Produit en vedette */}
        <div className={styles.heroVisual}>
          <div 
            ref={productRef}
            className={`${styles.cardWrapper} ${isTransitioning ? styles.transitioning : ''}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${-mousePosition.y}deg)`,
            }}
          >
            {/* Glow effect */}
            <div className={styles.cardGlow} />
            
            {/* Le produit */}
            <div className={styles.cardFrame}>
              <img
                src={currentProduct.image}
                alt={`${currentProduct.name} - ${currentProduct.subtitle}`}
                className={styles.cardImage}
              />
              
              {/* Effet holographique */}
              <div className={styles.holoEffect} />
            </div>

            {/* Info produit */}
            <div className={styles.cardInfo}>
              <span className={styles.cardSet}>{currentProduct.set}</span>
              <span className={styles.cardName}>{currentProduct.name}</span>
              <span className={styles.cardSubtitle}>{currentProduct.subtitle}</span>
            </div>
          </div>

          {/* Indicateur scroll */}
          <div className={styles.scrollIndicator}>
            <span className={styles.scrollText}>Défiler</span>
            <div className={styles.scrollLine}>
              <div className={styles.scrollDot} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
