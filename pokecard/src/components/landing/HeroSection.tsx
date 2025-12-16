import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ArrowRightIcon } from '../icons/Icons';
import styles from './HeroSection.module.css';

// Cartes en rotation — représentant différents univers
const HERO_CARDS = [
  {
    id: 1,
    name: 'Dracaufeu ex',
    subtitle: 'Special Art Rare',
    set: 'Écarlate et Violet',
    universe: 'Pokémon',
    image: '/carte_accueil/card01.png',
  },
  {
    id: 2,
    name: 'Luffy Gear 5',
    subtitle: 'Leader Card',
    set: 'OP-05',
    universe: 'One Piece',
    image: '/carte_accueil/card02.png',
  },
  {
    id: 3,
    name: 'Pikachu VMAX',
    subtitle: 'Rainbow Rare',
    set: 'Voltage Éclatant',
    universe: 'Pokémon',
    image: '/carte_accueil/card03.png',
  },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentCard = HERO_CARDS[currentCardIndex];

  // Rotation automatique des cartes
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentCardIndex((prev) => (prev + 1) % HERO_CARDS.length);
        setIsTransitioning(false);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Effet de parallaxe subtil sur la carte
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) / rect.width;
      const y = (e.clientY - centerY) / rect.height;
      
      setMousePosition({ x: x * 12, y: y * 12 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
            <span>{currentCard.universe}</span>
          </div>
          
          <h1 className={styles.title}>
            <span className={styles.titleMain}>Collectionnez.</span>
            <span className={styles.titleMain}>Investissez.</span>
            <span className={styles.titleAccent}>Vivez votre passion.</span>
          </h1>

          <p className={styles.description}>
            Que vous cherchiez la carte rare qui manque à votre collection, 
            un booster à ouvrir pour le frisson de la découverte, ou un investissement 
            sûr pour l'avenir — Boulevard réunit tous les passionnés de TCG.
          </p>

          <div className={styles.heroActions}>
            <button
              onClick={() => navigate('/produits')}
              className={styles.primaryCta}
            >
              <span>Explorer la boutique</span>
              <ArrowRightIcon size={18} />
            </button>
            
            <button
              onClick={() => navigate('/trade')}
              className={styles.secondaryCta}
            >
              Parcourir les cartes
            </button>
          </div>

          {/* Card indicators */}
          <div className={styles.cardIndicators}>
            {HERO_CARDS.map((card, index) => (
              <button
                key={card.id}
                className={`${styles.indicator} ${index === currentCardIndex ? styles.active : ''}`}
                onClick={() => {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentCardIndex(index);
                    setIsTransitioning(false);
                  }, 300);
                }}
                aria-label={`Voir ${card.name}`}
              >
                <span className={styles.indicatorProgress} />
              </button>
            ))}
          </div>
        </div>

        {/* Carte en vedette */}
        <div className={styles.heroVisual}>
          <div 
            ref={cardRef}
            className={`${styles.cardWrapper} ${isTransitioning ? styles.transitioning : ''}`}
            style={{
              transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${-mousePosition.y}deg)`,
            }}
          >
            {/* Glow effect */}
            <div className={styles.cardGlow} />
            
            {/* La carte */}
            <div className={styles.cardFrame}>
              <img
                src={currentCard.image}
                alt={`${currentCard.name} - ${currentCard.subtitle}`}
                className={styles.cardImage}
              />
              
              {/* Effet holographique */}
              <div className={styles.holoEffect} />
            </div>

            {/* Info carte */}
            <div className={styles.cardInfo}>
              <span className={styles.cardSet}>{currentCard.set}</span>
              <span className={styles.cardName}>{currentCard.name}</span>
              <span className={styles.cardSubtitle}>{currentCard.subtitle}</span>
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
