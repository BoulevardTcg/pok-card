import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ArrowRightIcon } from '../icons/Icons';
import styles from './HeroSection.module.css';

// Produits scellés en rotation — représentant différents univers
// Les images de cartes 3D sont utilisées pour l'effet visuel
const HERO_PRODUCTS = [
  {
    id: 1,
    name: 'Display One Piece OP13',
    subtitle: 'Display 24 boosters',
    set: 'OP13',
    universe: 'One Piece',
    image: '/carte_accueil/card02.png',
  },
  {
    id: 2,
    name: 'UPC Flammes Fantasmagoriques',
    subtitle: 'Ultra Premium Collection',
    set: 'ME02',
    universe: 'Pokémon',
    image: '/carte_accueil/card03.png',
  },
  {
    id: 3,
    name: 'Dracaufeu',
    subtitle: 'Carte Pokémon',
    set: 'ME02',
    universe: 'Pokémon',
    image: '/carte_accueil/dracaufeu.png',
  },
  {
    id: 4,
    name: 'Yasuo',
    subtitle: 'Champion League of Legends',
    set: 'LoR',
    universe: 'League of Legends',
    image: '/carte_accueil/yasuo.png',
  },
  {
    id: 5,
    name: 'Yone',
    subtitle: 'Champion League of Legends',
    set: 'LoR',
    universe: 'League of Legends',
    image: '/carte_accueil/yone.png',
  },
  {
    id: 6,
    name: 'Yu-Gi-Oh!',
    subtitle: 'Carte de collection',
    set: 'YG',
    universe: 'Yu-Gi-Oh!',
    image: '/carte_accueil/yugiho.png',
  },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const animationPausedRef = useRef(false);

  const currentProduct = HERO_PRODUCTS[currentProductIndex];

  useEffect(() => {
    const promises = HERO_PRODUCTS.map((product) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = product.image;
      });
    });
    Promise.all(promises);
  }, []);

  const handleProductChange = (nextIndex: number) => {
    animationPausedRef.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentProductIndex(nextIndex);
      setIsTransitioning(false);
      animationPausedRef.current = false;
    }, 300);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentProductIndex + 1) % HERO_PRODUCTS.length;
      handleProductChange(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentProductIndex]);

  useEffect(() => {
    if (!productRef.current) return;

    const isMobile = window.innerWidth < 1024;
    const speed = isMobile ? 0.018 : 0.015;
    const amplitude = isMobile ? 18 : 15;
    const amplitudeY = isMobile ? 14 : 12;
    const smoothing = isMobile ? 0.18 : 0.2;

    let lastX = 0;
    let lastY = 0;
    let rafId: number;
    let isActive = true;

    if (!isMobile) {
      productRef.current.style.willChange = 'transform';
    }

    const animate = () => {
      if (!isActive || !productRef.current || animationPausedRef.current) {
        if (isActive) {
          rafId = requestAnimationFrame(animate);
        }
        return;
      }

      timeRef.current += speed;
      const x = Math.sin(timeRef.current) * amplitude;
      const y = Math.cos(timeRef.current * 0.8) * amplitudeY;
      const smoothX = lastX + (x - lastX) * smoothing;
      const smoothY = lastY + (y - lastY) * smoothing;

      lastX = smoothX;
      lastY = smoothY;

      productRef.current.style.transform = `perspective(1000px) translate3d(0, 0, 0) rotateY(${smoothX}deg) rotateX(${-smoothY}deg)`;

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isActive = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (productRef.current && !isMobile) {
        productRef.current.style.willChange = 'auto';
      }
    };
  }, []);

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
            Boosters, displays, coffrets ETB et collections premium — Boulevard vous propose une
            sélection soignée de produits scellés pour tous les passionnés de TCG.
          </p>

          <div className={styles.heroActions}>
            <button onClick={() => navigate('/produits')} className={styles.primaryCta}>
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
                onClick={() => handleProductChange(index)}
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
          >
            {/* Glow effect */}
            <div className={styles.cardGlow} />

            <div className={styles.cardFrame}>
              <img
                src={currentProduct.image}
                alt={`${currentProduct.name} - ${currentProduct.subtitle}`}
                className={styles.cardImage}
                loading="eager"
              />
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
