import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../icons/Icons';
import styles from './FinalCTA.module.css';

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.backgroundImage}>
        {/* Image de fond ou pattern */}
        <div className={styles.overlay} />
      </div>

      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.overline}>Rejoignez l'aventure</span>

          <h2 className={styles.title}>
            Produits scellés premium
            <br />
            pour tous les passionnés.
          </h2>

          <p className={styles.description}>
            Produits scellés authentiques avec livraison sécurisée.
          </p>

          <div className={styles.actions}>
            <button onClick={() => navigate('/produits')} className={styles.primaryButton}>
              <span>Découvrir la boutique</span>
              <ArrowRightIcon size={18} />
            </button>
          </div>

          {/* Trust badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <span className={styles.badgeValue}>100%</span>
              <span className={styles.badgeLabel}>Authentique</span>
            </div>
            <div className={styles.trustDivider} />
            <div className={styles.trustBadge}>
              <span className={styles.badgeValue}>5</span>
              <span className={styles.badgeLabel}>Univers TCG</span>
            </div>
            <div className={styles.trustDivider} />
            <div className={styles.trustBadge}>
              <span className={styles.badgeValue}>30</span>
              <span className={styles.badgeLabel}>Produits</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
