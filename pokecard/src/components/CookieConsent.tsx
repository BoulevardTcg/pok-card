import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  disableAnalytics,
  enableAnalytics,
  getStoredConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  storeConsent,
} from '../lib/analytics';
import styles from './CookieConsent.module.css';

/**
 * Bandeau de consentement RGPD. Google Analytics n'est chargé qu'après
 * acceptation explicite ; le choix est mémorisé dans localStorage.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // Au montage : si l'utilisateur a déjà accepté, on (ré)active GA.
  // Sinon, on affiche le bandeau uniquement s'il n'a jamais choisi.
  useEffect(() => {
    const consent = getStoredConsent();
    if (consent === 'granted') {
      enableAnalytics();
    } else if (consent === null) {
      setVisible(true);
    }
  }, []);

  // Réouverture via le lien « Gérer les cookies ».
  useEffect(() => {
    const handleOpen = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpen);
  }, []);

  const accept = useCallback(() => {
    storeConsent('granted');
    enableAnalytics();
    setVisible(false);
  }, []);

  const refuse = useCallback(() => {
    storeConsent('denied');
    disableAnalytics();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div className={styles.content}>
        <div className={styles.text}>
          <p id="cookie-consent-title" className={styles.title}>
            Cookies &amp; confidentialité
          </p>
          <p id="cookie-consent-desc" className={styles.description}>
            Nous utilisons des cookies de mesure d'audience pour comprendre comment notre site est
            utilisé et l'améliorer. Ils ne sont déposés qu'avec votre accord. Consultez notre{' '}
            <Link to="/confidentialite" className={styles.link}>
              politique de confidentialité
            </Link>
            .
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.refuse} onClick={refuse}>
            Refuser
          </button>
          <button type="button" className={styles.accept} onClick={accept}>
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
