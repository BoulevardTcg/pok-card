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
  const animationFrameRef = useRef<number>();
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
    
    const animate = () => {
      timeRef.current += 0.012; // Plus rapide pour plus de dynamisme
      
      // Mouvement circulaire plus ample et dynamique
      const x = Math.sin(timeRef.current) * 18; // Amplitude augmentée
      const y = Math.cos(timeRef.current * 0.85) * 14; // Amplitude augmentée
      
      // Interpolation pour éviter les changements brusques
      const smoothX = lastX + (x - lastX) * 0.18; // Plus réactif
      const smoothY = lastY + (y - lastY) * 0.18; // Plus réactif
      
      lastX = smoothX;
      lastY = smoothY;
      
      setAutoRotation({ x: smoothX, y: smoothY });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
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
