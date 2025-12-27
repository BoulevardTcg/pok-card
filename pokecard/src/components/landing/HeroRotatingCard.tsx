import { useEffect, useState } from 'react';
import styles from './HeroRotatingCard.module.css';

const cards = [
  {
    image: '/carte_accueil/card01.png',
    name: 'Carte 1',
  },
  {
    image: '/carte_accueil/card02.png',
    name: 'Carte 2',
  },
  {
    image: '/carte_accueil/card03.png',
    name: 'Carte 3',
  },
];

export default function HeroRotatingCard() {
  const [index, setIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

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

  const card = cards[index];

  return (
    <div className={styles.cardWrapper}>
      <div className={`${styles.card} ${isFlipping ? styles.flipping : ''}`}>
        <img src={card.image} alt={card.name} className={styles.cardImage} />
        <div className={styles.cardShine} />
      </div>
    </div>
  );
}
