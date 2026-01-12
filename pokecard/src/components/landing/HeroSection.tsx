import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const shouldReduceMotion = useReducedMotion();

  const currentProduct = HERO_PRODUCTS[currentProductIndex];

  // Particules mémorisées pour éviter le recalcul à chaque re-render
  const particles = useMemo(
    () =>
      [...Array(50)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${8 + Math.random() * 12}s`,
      })),
    []
  );

  // Configuration spring pour animations hero
  const SPRING_HERO = {
    type: 'spring' as const,
    stiffness: shouldReduceMotion ? 300 : 280,
    damping: shouldReduceMotion ? 30 : 25,
    mass: shouldReduceMotion ? 1 : 0.75,
  };

  // Variants pour le container avec stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0.05 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.1,
      },
    },
  };

  // Variants pour chaque item (H1 lignes, texte, boutons)
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 12,
      filter: shouldReduceMotion ? 'blur(0px)' : 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: SPRING_HERO,
    },
  };

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

    // Paramètres uniformes sur toutes les plateformes (vitesse lente comme sur desktop)
    const speed = 0.015;
    const amplitude = 15;
    const amplitudeY = 12;
    const smoothing = 0.2;

    let lastX = 0;
    let lastY = 0;
    let rafId: number;
    let isActive = true;

    productRef.current.style.willChange = 'transform';

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
      if (productRef.current) {
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
        {/* Particules flottantes (indépendantes des changements de carte) */}
        <div className={styles.particles}>
          {particles.map((p) => (
            <span
              key={p.id}
              className={styles.particle}
              style={{
                left: p.left,
                animationDelay: p.animationDelay,
                animationDuration: p.animationDuration,
              }}
            />
          ))}
        </div>
      </div>

      <div className={styles.heroContainer}>
        {/* Contenu textuel avec animations stagger */}
        <motion.div
          className={styles.heroContent}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className={styles.universeBadge} variants={itemVariants}>
            <span className={styles.universeDot} />
            <span>{currentProduct.universe}</span>
          </motion.div>

          <h1 className={styles.title}>
            <motion.span className={styles.titleMain} variants={itemVariants}>
              Découvrez.
            </motion.span>
            <motion.span className={styles.titleMain} variants={itemVariants}>
              Collectionnez.
            </motion.span>
            <motion.span className={styles.titleAccent} variants={itemVariants}>
              Play your cards.
            </motion.span>
          </h1>

          <motion.p className={styles.description} variants={itemVariants}>
            Boulevard propose des produits scellés pour les passionnés de cartes à collectionner.
          </motion.p>

          <motion.div className={styles.heroActions} variants={itemVariants}>
            <motion.button
              onClick={() => navigate('/produits')}
              className={styles.primaryCta}
              whileHover={{ scale: shouldReduceMotion ? 1 : 1.02, y: shouldReduceMotion ? 0 : -1 }}
              whileTap={{ scale: shouldReduceMotion ? 1 : 0.98 }}
              transition={SPRING_HERO}
            >
              <span>Explorer la boutique</span>
              <ArrowRightIcon size={18} />
            </motion.button>
          </motion.div>

          {/* Product indicators */}
          <motion.div className={styles.cardIndicators} variants={itemVariants}>
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
          </motion.div>
        </motion.div>

        {/* Produit en vedette */}
        <motion.div
          className={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            ref={productRef}
            className={`${styles.cardWrapper} ${isTransitioning ? styles.transitioning : ''}`}
          >
            {/* Glow effect pulsant */}
            <div className={styles.cardGlow} />
            <div className={styles.cardGlowPulse} />

            <div className={styles.cardFrame}>
              <img
                src={currentProduct.image}
                alt={`${currentProduct.name} - ${currentProduct.subtitle}`}
                className={styles.cardImage}
                loading="eager"
              />
              {/* Effet shimmer */}
              <div className={styles.cardShimmer} />
            </div>

            {/* Info produit */}
            <div className={styles.cardInfo}>
              <span className={styles.cardSet}>{currentProduct.set}</span>
              <span className={styles.cardName}>{currentProduct.name}</span>
              <span className={styles.cardSubtitle}>{currentProduct.subtitle}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Indicateur scroll - centré en bas de la section */}
      <div className={styles.scrollIndicator}>
        <div className={styles.scrollLine}>
          <div className={styles.scrollDot} />
        </div>
        <span className={styles.scrollText}>Défiler</span>
      </div>
    </section>
  );
}
