import { useNavigate } from 'react-router-dom';
import HeroRotatingCard from './HeroRotatingCard';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className={styles.heroSection}>
      {/* Pattern décoratif subtil */}
      <div className={styles.heroPattern}></div>

      <div className={styles.heroContainer}>
        <div className={styles.heroGrid}>
          {/* Texte */}
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Votre nouvelle{' '}
              <span className={styles.heroTitleAccent}>avenue prestige</span>
              <br />
              du TCG.
            </h1>
            
            <p className={styles.heroDescription}>
              Plongez dans l'univers raffiné du Trading Card Game. 
              BoulevardTCG incarne l'élégance parisienne, la confiance absolue 
              et la qualité irréprochable. Chaque carte, chaque collection, 
              chaque moment d'achat devient une expérience d'exception.
            </p>

            {/* CTA */}
            <div className={styles.heroCTAs}>
              <button
                onClick={() => navigate('/produits')}
                className={styles.heroCTAPrimary}
              >
                Accéder à la boutique
                <span className={styles.ctaArrow}>→</span>
              </button>
              
              <button
                onClick={() => navigate('/cartes')}
                className={styles.heroCTASecondary}
              >
                Découvrir les cartes
              </button>
            </div>
          </div>

          {/* Visuel - Carte animée */}
          <div className={styles.heroVisual}>
            <HeroRotatingCard />
          </div>
        </div>
      </div>
    </section>
  );
}

