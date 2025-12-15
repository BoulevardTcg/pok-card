import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './CheckoutSuccess.module.css';

export function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer le session_id depuis l'URL si présent
    const sessionIdParam = searchParams.get('session_id');
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.iconContainer}>
          <div className={styles.checkmark}>
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" stroke="#06b6d4" strokeWidth="2"/>
              <path fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-16"/>
            </svg>
          </div>
        </div>
        
        <h1 className={styles.title}>Paiement réussi !</h1>
        <p className={styles.message}>
          Merci pour votre achat. Votre commande a été confirmée et sera traitée dans les plus brefs délais.
        </p>
        
        {sessionId && (
          <div className={styles.sessionInfo}>
            <p className={styles.sessionLabel}>Numéro de session :</p>
            <p className={styles.sessionId}>{sessionId}</p>
          </div>
        )}
        
        <div className={styles.actions}>
          <button 
            className={styles.primaryButton}
            onClick={() => navigate('/produits')}
          >
            Continuer mes achats
          </button>
          <button 
            className={styles.secondaryButton}
            onClick={() => navigate('/')}
          >
            Retour à l'accueil
          </button>
        </div>
        
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            📧 Vous recevrez un email de confirmation avec les détails de votre commande.
          </p>
        </div>
      </div>
    </div>
  );
}




