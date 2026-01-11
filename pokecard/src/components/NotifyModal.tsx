import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { API_BASE } from '../api';
import styles from './NotifyModal.module.css';

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  variantId?: string;
}

export function NotifyModal({
  isOpen,
  onClose,
  productId,
  productName,
  variantId,
}: NotifyModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gérer l'overflow du body quand la modal est ouverte
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder la valeur actuelle de overflow
      const originalOverflow = document.body.style.overflow;
      // Désactiver le scroll
      document.body.style.overflow = 'hidden';
      // Restaurer au démontage
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: { email: string; productId: string; variantId?: string } = {
        email,
        productId,
      };

      if (variantId) {
        payload.variantId = variantId;
      }

      const response = await fetch(`${API_BASE}/products/notify-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setEmail('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>

        <div className={styles.content}>
          <h2 className={styles.title}>Me prévenir</h2>
          <p className={styles.description}>
            Entrez votre adresse email pour être notifié lorsque <strong>{productName}</strong> sera
            de nouveau disponible.
          </p>

          {success ? (
            <div className={styles.successMessage}>
              ✓ Votre demande a été enregistrée. Vous recevrez un email dès que le produit sera
              disponible.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className={styles.input}
                  required
                  disabled={loading}
                />
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={onClose}
                  className={styles.cancelButton}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button type="submit" className={styles.submitButton} disabled={loading || !email}>
                  {loading ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  // Utiliser createPortal pour rendre la modal directement dans le body
  return createPortal(modalContent, document.body);
}
