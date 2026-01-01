import { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CartContext } from './cartContext';
import { API_BASE } from './api';
import styles from './CheckoutSuccess.module.css';

export function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { clearCart } = useContext(CartContext);

  useEffect(() => {
    // Stripe utilise "sid" comme paramètre (évite un bug d'encodage avec "session_id")
    const sessionIdParam = searchParams.get('sid') || searchParams.get('session_id');
    if (sessionIdParam) {
      verifyAndCreateOrder(sessionIdParam);
    } else {
      setLoading(false);
    }

    // Vider le panier après un checkout réussi
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function verifyAndCreateOrder(sessionId: string) {
    try {
      setLoading(true);
      setError(null);

      // Récupérer le token si l'utilisateur est connecté
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/checkout/verify-session/${sessionId}`, {
        headers,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrderNumber(data.orderNumber);
        setOrderCreated(true);
        console.log(
          `✅ Commande ${data.alreadyCreated ? 'existante' : 'créée'}: ${data.orderNumber}`
        );
      } else {
        // Ne pas afficher d'erreur si le paiement n'est pas encore complété
        if (data.code !== 'PAYMENT_NOT_COMPLETED') {
          setError(data.error || 'Erreur lors de la création de la commande');
        }
      }
    } catch (err: Error) {
      console.error('Erreur lors de la vérification:', err);
      setError(err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.iconContainer}>
          <div className={styles.checkmark}>
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" fill="none" stroke="#D7B56D" strokeWidth="2" />
              <path
                fill="none"
                stroke="#D7B56D"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l8 8 16-16"
              />
            </svg>
          </div>
        </div>

        <h1 className={styles.title}>Paiement réussi !</h1>
        <p className={styles.message}>
          Merci pour votre achat. Votre commande a été confirmée et sera traitée dans les plus brefs
          délais.
        </p>

        {loading ? (
          <div className={styles.sessionInfo}>
            <p className={styles.sessionLabel}>Création de votre commande...</p>
          </div>
        ) : orderNumber ? (
          <div className={styles.sessionInfo}>
            <p className={styles.sessionLabel}>Numéro de commande :</p>
            <p className={styles.sessionId}>{orderNumber}</p>
          </div>
        ) : error ? (
          <div className={styles.sessionInfo}>
            <p className={styles.sessionLabel} style={{ color: '#ef4444' }}>
              {error}
            </p>
          </div>
        ) : null}

        <div className={styles.actions}>
          {orderCreated && (
            <button className={styles.primaryButton} onClick={() => navigate('/orders')}>
              Voir mes commandes
            </button>
          )}
          <button
            className={orderCreated ? styles.secondaryButton : styles.primaryButton}
            onClick={() => navigate('/produits')}
          >
            Continuer mes achats
          </button>
          <button className={styles.secondaryButton} onClick={() => navigate('/')}>
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
