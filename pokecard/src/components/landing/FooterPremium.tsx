import { useNavigate } from 'react-router-dom';
import styles from './FooterPremium.module.css';

export default function FooterPremium() {
  const navigate = useNavigate();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.logoGroup}>
              <span className={styles.logoText}>Boulevard</span>
              <span className={styles.logoSubtext}>TCG</span>
            </div>
            <p className={styles.description}>
              Le Boulevard Prestige du TCG. Découvrez l'excellence du Trading Card Game 
              dans une expérience luxe parisienne, où chaque carte raconte une histoire.
            </p>
            <div className={styles.socialLinks}>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Instagram"
              >
                📷
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Facebook"
              >
                📘
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Twitter"
              >
                🐦
              </a>
              <a 
                href="mailto:contact@boulevardtcg.com" 
                className={styles.socialLink}
                aria-label="Email"
              >
                ✉️
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Navigation
            </h3>
            <ul className={styles.linkList}>
              <li>
                <button onClick={() => navigate('/')} className={styles.link}>Accueil</button>
              </li>
              <li>
                <button onClick={() => navigate('/produits')} className={styles.link}>Boutique</button>
              </li>
              <li>
                <button onClick={() => navigate('/cartes')} className={styles.link}>Cartes</button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')} className={styles.link}>Contact</button>
              </li>
            </ul>
          </div>

          {/* Informations */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Informations
            </h3>
            <ul className={styles.linkList}>
              <li>
                <button className={styles.link}>Mentions légales</button>
              </li>
              <li>
                <button className={styles.link}>Confidentialité</button>
              </li>
              <li>
                <button className={styles.link}>Cookies</button>
              </li>
              <li>
                <button className={styles.link}>Contact</button>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider}></div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p className={styles.copyrightText}>
            © {new Date().getFullYear()} BoulevardTCG. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}

