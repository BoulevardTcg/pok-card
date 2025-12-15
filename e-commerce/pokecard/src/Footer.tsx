import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        {/* Main Section */}
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <div className={styles.logoIcon}>PC</div>
              <span className={styles.logoText}>PokéCard</span>
            </div>
            <p className={styles.footerDescription}>
              Votre destination premium pour les cartes TCG de collection.
              Authentiques, certifiées et livrées avec soin.
            </p>
            <div className={styles.socialLinks}>
              <a href="#" className={styles.socialLink} aria-label="Facebook">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Twitter">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="Instagram">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.718-1.297c-.875.807-2.026 1.297-3.323 1.297s-2.448-.49-3.323-1.297c-.928-.875-1.418-2.026-1.418-3.323s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.323z"/>
                </svg>
              </a>
              <a href="#" className={styles.socialLink} aria-label="YouTube">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <div className={styles.footerSection}>
              <h3 className={styles.footerSectionTitle}>Navigation</h3>
              <ul className={styles.footerLinkList}>
                <li><button onClick={() => navigate('/')} className={styles.footerLink}>Accueil</button></li>
                {/* Masqué temporairement - en développement */}
                {/* <li><button onClick={() => navigate('/cartes')} className={styles.footerLink}>Cartes</button></li> */}
                <li><button onClick={() => navigate('/produits')} className={styles.footerLink}>Produits TCG</button></li>
                <li><button onClick={() => navigate('/protections')} className={styles.footerLink}>Protections</button></li>
                {/* Masqué temporairement - en développement */}
                {/* <li><button onClick={() => navigate('/concours')} className={styles.footerLink}>Concours</button></li> */}
                {/* Masqué temporairement - en développement */}
                {/* <li><button onClick={() => navigate('/trade')} className={styles.footerLink}>Échanges</button></li> */}
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h3 className={styles.footerSectionTitle}>Support</h3>
              <ul className={styles.footerLinkList}>
                <li><button onClick={() => navigate('/contact')} className={styles.footerLink}>Contact</button></li>
                <li><button className={styles.footerLink}>FAQ</button></li>
                <li><button className={styles.footerLink}>Livraison</button></li>
                <li><button className={styles.footerLink}>Retours</button></li>
                <li><button className={styles.footerLink}>Garantie</button></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h3 className={styles.footerSectionTitle}>Légal</h3>
              <ul className={styles.footerLinkList}>
                <li><button className={styles.footerLink}>Conditions générales</button></li>
                <li><button className={styles.footerLink}>Politique de confidentialité</button></li>
                <li><button className={styles.footerLink}>Mentions légales</button></li>
                <li><button className={styles.footerLink}>CGV</button></li>
                <li><button className={styles.footerLink}>Cookies</button></li>
              </ul>
            </div>

            <div className={styles.footerSection}>
              <h3 className={styles.footerSectionTitle}>Newsletter</h3>
              <p className={styles.newsletterText}>
                Restez informé des nouveautés et offres exclusives !
              </p>
              <div className={styles.newsletterForm}>
                <input
                  type="email"
                  placeholder="Votre email"
                  className={styles.newsletterInput}
                />
                <button className={styles.newsletterButton}>
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
