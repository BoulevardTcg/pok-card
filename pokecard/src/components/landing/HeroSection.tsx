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
  const [imageKey, setImageKey] = useState(0); // Key pour forcer le rechargement
  const productRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const loadedImagesRef = useRef<Set<string>>(new Set());
  const isMobileRef = useRef(window.innerWidth < 1024);
  const animationPausedRef = useRef(false);

  const currentProduct = HERO_PRODUCTS[currentProductIndex];

  // Précharger toutes les images pour éviter les problèmes d'affichage
  useEffect(() => {
    const preloadImages = async () => {
      const promises = HERO_PRODUCTS.map((product) => {
        return new Promise<void>((resolve) => {
          // Vérifier si l'image est déjà chargée
          if (loadedImagesRef.current.has(product.image)) {
            resolve();
            return;
          }

          const img = new Image();
          img.onload = () => {
            loadedImagesRef.current.add(product.image);
            resolve();
          };
          img.onerror = () => {
            console.warn('Erreur de préchargement:', product.image);
            resolve(); // Continuer même en cas d'erreur
          };
          // Charger l'image normalement (sans timestamp pour le préchargement)
          img.src = product.image;
        });
      });

      await Promise.all(promises);
    };

    preloadImages();
  }, []);

  // Rotation automatique des produits
  useEffect(() => {
    const interval = setInterval(() => {
      // ⚡ OPTIMISATION: Pauser l'animation 3D pendant la transition
      animationPausedRef.current = true;
      setIsTransitioning(true);
      setTimeout(() => {
        const nextIndex = (currentProductIndex + 1) % HERO_PRODUCTS.length;
        setCurrentProductIndex(nextIndex);
        // Forcer le rechargement de l'image en changeant la key
        setImageKey((prev) => prev + 1);
        setIsTransitioning(false);
        // Reprendre l'animation après la transition
        animationPausedRef.current = false;
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentProductIndex]);

  // Animation automatique continue (mouvement 3D dynamique)
  // ⚡ OPTIMISATION: Manipulation DOM directe (pas de setState) pour éviter les rerenders React
  useEffect(() => {
    if (!productRef.current) return;

    let lastX = 0;
    let lastY = 0;
    let rafId: number;
    let isActive = true;

    // Détecter si on est sur mobile et adapter les paramètres
    const isMobile = isMobileRef.current;
    const speed = isMobile ? 0.008 : 0.015; // Plus lent sur mobile pour meilleures performances
    const amplitude = isMobile ? 8 : 15; // Amplitude réduite sur mobile
    const amplitudeY = isMobile ? 6 : 12;
    const smoothing = isMobile ? 0.3 : 0.2; // Plus de lissage sur mobile pour fluidité

    // Optimisation: Ajouter will-change seulement pendant l'animation
    if (!isMobile && productRef.current) {
      productRef.current.style.willChange = 'transform';
    }

    const animate = () => {
      if (!isActive || !productRef.current || animationPausedRef.current) {
        // Continuer la boucle même si paused (pour reprendre rapidement)
        if (isActive) {
          rafId = requestAnimationFrame(animate);
        }
        return;
      }

      timeRef.current += speed;

      // Mouvement circulaire
      const x = Math.sin(timeRef.current) * amplitude;
      const y = Math.cos(timeRef.current * 0.8) * amplitudeY;

      // Interpolation pour éviter les changements brusques
      const smoothX = lastX + (x - lastX) * smoothing;
      const smoothY = lastY + (y - lastY) * smoothing;

      lastX = smoothX;
      lastY = smoothY;

      // ⚡ OPTIMISATION: Manipulation DOM directe au lieu de setState
      // ⚡ Utilisation de translate3d pour forcer l'accélération GPU (meilleure performance)
      productRef.current.style.transform = `perspective(1000px) translate3d(0, 0, 0) rotateY(${smoothX}deg) rotateX(${-smoothY}deg)`;

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isActive = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      // Nettoyer will-change quand l'animation s'arrête
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
                onClick={() => {
                  // ⚡ OPTIMISATION: Pauser l'animation 3D pendant la transition
                  animationPausedRef.current = true;
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentProductIndex(index);
                    // Forcer le rechargement de l'image
                    setImageKey((prev) => prev + 1);
                    setIsTransitioning(false);
                    // Reprendre l'animation après la transition
                    animationPausedRef.current = false;
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
          >
            {/* Glow effect */}
            <div className={styles.cardGlow} />

            {/* Le produit */}
            <div className={styles.cardFrame}>
              <img
                key={`${currentProduct.id}-${imageKey}`}
                src={currentProduct.image}
                alt={`${currentProduct.name} - ${currentProduct.subtitle}`}
                className={styles.cardImage}
                loading="eager"
                onError={(e) => {
                  console.warn("Erreur de chargement de l'image:", currentProduct.image);
                  // Essayer de recharger avec un timestamp
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('?')) {
                    target.src = `${currentProduct.image}?retry=${Date.now()}`;
                  }
                }}
                onLoad={() => {
                  // Image chargée avec succès
                  loadedImagesRef.current.add(currentProduct.image);
                }}
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
