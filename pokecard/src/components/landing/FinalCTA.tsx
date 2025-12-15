import { useNavigate } from 'react-router-dom';
import styles from './FinalCTA.module.css';

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      {/* Pattern décoratif */}
      <div className={styles.pattern}></div>

      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>✨</span>
        </div>

        <h2 className={styles.title}>
          Prêt à entrer dans le
          <br />
          <span className={styles.titleAccent}>Boulevard du TCG ?</span>
        </h2>

        <p className={styles.description}>
          Rejoignez une communauté d'amateurs exigeants qui font confiance 
          à BoulevardTCG pour leurs collections premium. Qualité, confiance, 
          élégance : l'excellence à chaque carte.
        </p>

        <div className={styles.cta}>
          <button
            onClick={() => navigate('/produits')}
            className={styles.ctaButton}
          >
            Commencer ma collection
            <span className={styles.ctaArrow}>→</span>
          </button>
        </div>

        {/* Éléments décoratifs */}
        <div className={styles.decorativeGlow1}></div>
        <div className={styles.decorativeGlow2}></div>
      </div>
    </section>
  );
}

