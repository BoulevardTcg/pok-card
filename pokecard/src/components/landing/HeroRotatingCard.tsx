import { useEffect, useState, useRef } from 'react';
import styles from './HeroRotatingCard.module.css';

const cards = [
  {
    image: '/carte_accueil/card02.png',
    name: 'Carte 2',
  },
  {
    image: '/carte_accueil/card03.png',
    name: 'Carte 3',
  },
  {
    image: '/carte_accueil/dracaufeu.png',
    name: 'Dracaufeu',
  },
  {
    image: '/carte_accueil/yasuo.png',
    name: 'Yasuo',
  },
  {
    image: '/carte_accueil/yone.png',
    name: 'Yone',
  },
  {
    image: '/carte_accueil/yugiho.png',
    name: 'Yu-Gi-Oh!',
  },
];

export default function HeroRotatingCard() {
  const [index, setIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [autoRotation, setAutoRotation] = useState({ x: 0, y: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % cards.length);
        setIsFlipping(false);
      }, 400);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Animation automatique continue (mouvement 3D dynamique)
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let rafId: number;

    // Détecter si on est sur mobile
    const isMobile = window.innerWidth < 1024;
    const amplitude = isMobile ? 10 : 18; // Amplitude réduite sur mobile
    const amplitudeY = isMobile ? 8 : 14;
    const speed = isMobile ? 0.006 : 0.012; // Plus lent sur mobile
    const smoothing = isMobile ? 0.25 : 0.18; // Plus de lissage sur mobile

    const animate = () => {
      timeRef.current += speed;

      // Mouvement circulaire
      const x = Math.sin(timeRef.current) * amplitude;
      const y = Math.cos(timeRef.current * 0.85) * amplitudeY;

      // Interpolation pour éviter les changements brusques
      const smoothX = lastX + (x - lastX) * smoothing;
      const smoothY = lastY + (y - lastY) * smoothing;

      lastX = smoothX;
      lastY = smoothY;

      setAutoRotation({ x: smoothX, y: smoothY });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const card = cards[index];

  return (
    <div className={styles.cardWrapper}>
      <div
        className={`${styles.card} ${isFlipping ? styles.flipping : ''}`}
        style={{
          transform: `perspective(1200px) rotateY(${autoRotation.x}deg) rotateX(${-autoRotation.y}deg)`,
        }}
      >
        <img src={card.image} alt={card.name} className={styles.cardImage} />
      </div>
    </div>
  );
}
