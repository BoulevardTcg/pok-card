import { useNavigate } from 'react-router-dom';
import { InstagramIcon, TwitterIcon, MailIcon } from '../icons/Icons';
import styles from './FooterPremium.module.css';

const NAV_LINKS = [
  { path: '/produits', label: 'Boutique' },
  { path: '/trade', label: 'Cartes' },
  { path: '/actualites', label: 'News' },
  { path: '/contact', label: 'Contact' },
];

const LEGAL_LINKS = [
  { path: '/mentions-legales', label: 'Mentions légales' },
  { path: '/confidentialite', label: 'Confidentialité' },
  { path: '/cgv', label: 'CGV' },
];

const SOCIAL_LINKS = [
  { href: 'https://instagram.com/boulevardtcg', icon: InstagramIcon, label: 'Instagram' },
  { href: 'https://twitter.com/boulevardtcg', icon: TwitterIcon, label: 'X (Twitter)' },
  { href: 'mailto:contact@boulevardtcg.com', icon: MailIcon, label: 'Email' },
];

export default function FooterPremium() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Main content */}
        <div className={styles.mainContent}>
          {/* Brand Section */}
          <div className={styles.brand}>
            <button
              className={styles.logo}
              onClick={() => navigate('/')}
              aria-label="Retour à l'accueil"
            >
              <span className={styles.logoMark}>B</span>
              <span className={styles.logoText}>Boulevard</span>
            </button>
            <p className={styles.tagline}>Play your cards.</p>
            <div className={styles.socialSection}>
              <span className={styles.socialLabel}>Suivez-nous</span>
              <div className={styles.socialLinks}>
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.href}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      aria-label={social.label}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className={styles.nav} aria-label="Navigation principale">
            <h3 className={styles.navTitle}>Navigation</h3>
            <ul className={styles.navLinks}>
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <button onClick={() => navigate(link.path)} className={styles.navLink}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav className={styles.legal} aria-label="Informations légales">
            <h3 className={styles.navTitle}>Informations</h3>
            <ul className={styles.navLinks}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.path}>
                  <button onClick={() => navigate(link.path)} className={styles.navLink}>
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottomBar}>
          <span className={styles.copyright}>
            © {currentYear} BoulevardTCG. Tous droits réservés.
          </span>

          <div className={styles.legalLinks}>
            {LEGAL_LINKS.map((link, index) => (
              <span key={link.path}>
                <button onClick={() => navigate(link.path)} className={styles.legalLink}>
                  {link.label}
                </button>
                {index < LEGAL_LINKS.length - 1 && <span className={styles.legalSeparator}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
