import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../icons/Icons';
import styles from './CollectionHighlight.module.css';

type Universe = 'pokemon' | 'onepiece';

interface CollectionSet {
  id: string;
  name: string;
  universe: Universe;
  cardsCount: number;
  image: string;
}

// Collections par univers
const COLLECTIONS: Record<Universe, { title: string; subtitle: string; sets: CollectionSet[] }> = {
  pokemon: {
    title: 'Pokémon TCG',
    subtitle: 'Écarlate et Violet',
    sets: [
      {
        id: 'sv1',
        name: 'Écarlate et Violet',
        universe: 'pokemon',
        cardsCount: 198,
        image: '/carte_accueil/card01.png',
      },
      {
        id: 'sv2',
        name: 'Évolutions à Paldea',
        universe: 'pokemon',
        cardsCount: 193,
        image: '/carte_accueil/card02.png',
      },
      {
        id: 'sv3',
        name: 'Flammes Obsidiennes',
        universe: 'pokemon',
        cardsCount: 197,
        image: '/carte_accueil/card03.png',
      },
      {
        id: 'sv4',
        name: 'Faille Paradoxe',
        universe: 'pokemon',
        cardsCount: 182,
        image: '/carte_accueil/card01.png',
      },
      {
        id: 'sv5',
        name: 'Forces Temporelles',
        universe: 'pokemon',
        cardsCount: 162,
        image: '/carte_accueil/card02.png',
      },
      {
        id: 'sv6',
        name: 'Mascarade Crépusculaire',
        universe: 'pokemon',
        cardsCount: 167,
        image: '/carte_accueil/card03.png',
      },
    ],
  },
  onepiece: {
    title: 'One Piece TCG',
    subtitle: 'La nouvelle ère',
    sets: [
      {
        id: 'op01',
        name: 'Romance Dawn',
        universe: 'onepiece',
        cardsCount: 121,
        image: '/carte_accueil/card01.png',
      },
      {
        id: 'op02',
        name: 'Paramount War',
        universe: 'onepiece',
        cardsCount: 121,
        image: '/carte_accueil/card02.png',
      },
      {
        id: 'op03',
        name: 'Pillars of Strength',
        universe: 'onepiece',
        cardsCount: 122,
        image: '/carte_accueil/card03.png',
      },
      {
        id: 'op04',
        name: 'Kingdoms of Intrigue',
        universe: 'onepiece',
        cardsCount: 121,
        image: '/carte_accueil/card01.png',
      },
      {
        id: 'op05',
        name: 'Awakening of the New Era',
        universe: 'onepiece',
        cardsCount: 121,
        image: '/carte_accueil/card02.png',
      },
    ],
  },
};

const UNIVERSE_LABELS: Record<Universe, string> = {
  pokemon: 'Pokémon',
  onepiece: 'One Piece',
};

export default function CollectionHighlight() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeUniverse, setActiveUniverse] = useState<Universe>('pokemon');
  const [scrollProgress, setScrollProgress] = useState(0);

  const currentCollection = COLLECTIONS[activeUniverse];

  useEffect(() => {
    // Reset scroll when changing universe
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      setScrollProgress(0);
    }
  }, [activeUniverse]);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? scrollLeft / maxScroll : 0;
      setScrollProgress(progress);
    };

    const element = scrollRef.current;
    element?.addEventListener('scroll', handleScroll, { passive: true });
    return () => element?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className={styles.section}>
      {/* Background parallax effect */}
      <div
        className={styles.backgroundPattern}
        style={{ transform: `translateX(${scrollProgress * -50}px)` }}
      />

      <div className={styles.container}>
        {/* Header with Universe Tabs */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              <span className={styles.overline}>Explorer par univers</span>
              <h2 className={styles.title}>{currentCollection.title}</h2>
              <span className={styles.subtitle}>{currentCollection.subtitle}</span>
            </div>

            {/* Universe Toggle */}
            <div className={styles.universeToggle}>
              {(Object.keys(COLLECTIONS) as Universe[]).map((universe) => (
                <button
                  key={universe}
                  onClick={() => setActiveUniverse(universe)}
                  className={`${styles.universeButton} ${activeUniverse === universe ? styles.active : ''}`}
                >
                  {UNIVERSE_LABELS[universe]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.headerRight}>
            <p className={styles.description}>
              Parcourez toutes les extensions et trouvez les cartes qui manquent à votre collection.
            </p>
            <button onClick={() => navigate('/trade')} className={styles.viewButton}>
              <span>Voir toutes les séries</span>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </div>

        {/* Scroll Progress */}
        <div className={styles.scrollProgressWrapper}>
          <div className={styles.scrollProgressTrack}>
            <div
              className={styles.scrollProgressBar}
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Horizontal Scroll Sets */}
        <div ref={scrollRef} className={styles.scrollContainer}>
          <div className={styles.setsTrack}>
            {currentCollection.sets.map((set, index) => (
              <div
                key={set.id}
                className={styles.setCard}
                style={{ animationDelay: `${index * 80}ms` }}
                onClick={() => navigate(`/trade/set/${set.id}`)}
              >
                <div className={styles.setCardInner}>
                  <img src={set.image} alt={set.name} className={styles.setImage} />
                  <div className={styles.setOverlay}>
                    <span className={styles.setCardsCount}>{set.cardsCount} cartes</span>
                    <span className={styles.setName}>{set.name}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* CTA Card */}
            <div className={styles.ctaCard} onClick={() => navigate('/trade')}>
              <span className={styles.ctaText}>+{currentCollection.sets.length * 3} séries</span>
              <button className={styles.ctaButton}>Explorer</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
