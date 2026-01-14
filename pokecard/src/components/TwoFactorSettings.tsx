import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Key,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { API_BASE } from '../api';
import styles from './TwoFactorSettings.module.css';

interface TwoFactorSettingsProps {
  token: string;
}

export function TwoFactorSettings({ token }: TwoFactorSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [disableMode, setDisableMode] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/2fa/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.twoFactorEnabled);
      }
    } catch (err) {
      console.error('Erreur lors de la vérification 2FA:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkStatus();
  }, [token, checkStatus]);

  async function startSetup() {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/2fa/setup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la configuration');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupMode(true);
    } catch (err: Error) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function enableTwoFactor() {
    if (verificationCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/2fa/enable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Code invalide');
      }

      setIsEnabled(true);
      setSetupMode(false);
      setQrCode(null);
      setSecret(null);
      setVerificationCode('');
      setSuccess('Authentification à deux facteurs activée avec succès !');

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: Error) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function disableTwoFactor() {
    if (verificationCode.length !== 6 || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/2fa/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la désactivation');
      }

      setIsEnabled(false);
      setDisableMode(false);
      setVerificationCode('');
      setPassword('');
      setSuccess('Authentification à deux facteurs désactivée');

      setTimeout(() => setSuccess(null), 5000);
    } catch (err: Error) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function cancelSetup() {
    setSetupMode(false);
    setDisableMode(false);
    setQrCode(null);
    setSecret(null);
    setVerificationCode('');
    setPassword('');
    setError(null);
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className={styles.spinner} size={24} />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          {isEnabled ? <ShieldCheck size={24} /> : <Shield size={24} />}
        </div>
        <div>
          <h3>Authentification à deux facteurs (2FA)</h3>
          <p>Protégez votre compte avec une couche de sécurité supplémentaire</p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className={styles.success}>
          <Check size={18} />
          {success}
        </div>
      )}

      {/* État actuel */}
      {!setupMode && !disableMode && (
        <div className={styles.status}>
          <div className={`${styles.statusBadge} ${isEnabled ? styles.enabled : styles.disabled}`}>
            {isEnabled ? (
              <>
                <ShieldCheck size={16} />
                Activé
              </>
            ) : (
              <>
                <ShieldOff size={16} />
                Désactivé
              </>
            )}
          </div>

          {isEnabled ? (
            <div className={styles.enabledInfo}>
              <p>Votre compte est protégé par l'authentification à deux facteurs.</p>
              <button onClick={() => setDisableMode(true)} className={styles.dangerButton}>
                Désactiver 2FA
              </button>
            </div>
          ) : (
            <div className={styles.disabledInfo}>
              <div className={styles.benefits}>
                <h4>Pourquoi activer le 2FA ?</h4>
                <ul>
                  <li>
                    <Check size={14} /> Protection contre le vol de mot de passe
                  </li>
                  <li>
                    <Check size={14} /> Sécurité renforcée pour vos données
                  </li>
                  <li>
                    <Check size={14} /> Tranquillité d'esprit
                  </li>
                </ul>
              </div>
              <button
                onClick={startSetup}
                disabled={actionLoading}
                className={styles.primaryButton}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className={styles.spinner} size={16} /> Configuration...
                  </>
                ) : (
                  <>
                    <Smartphone size={16} /> Configurer 2FA
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode configuration */}
      {setupMode && qrCode && (
        <div className={styles.setup}>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h4>Téléchargez une application d'authentification</h4>
                <p>Google Authenticator, Authy, ou Microsoft Authenticator</p>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h4>Scannez le QR code</h4>
                <div className={styles.qrContainer}>
                  <img src={qrCode} alt="QR Code 2FA" className={styles.qrCode} />
                </div>
                <div className={styles.secretKey}>
                  <p>Ou entrez manuellement cette clé :</p>
                  <code>{secret}</code>
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h4>Entrez le code de vérification</h4>
                <p>Saisissez le code à 6 chiffres affiché dans l'application</p>
                <div className={styles.codeInput}>
                  <Key size={20} />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                    className={styles.input}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={cancelSetup} className={styles.secondaryButton}>
              <X size={16} /> Annuler
            </button>
            <button
              onClick={enableTwoFactor}
              disabled={actionLoading || verificationCode.length !== 6}
              className={styles.primaryButton}
            >
              {actionLoading ? (
                <>
                  <Loader2 className={styles.spinner} size={16} /> Vérification...
                </>
              ) : (
                <>
                  <Check size={16} /> Activer 2FA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode désactivation */}
      {disableMode && (
        <div className={styles.disable}>
          <div className={styles.warning}>
            <AlertTriangle size={24} />
            <div>
              <h4>Attention !</h4>
              <p>Désactiver le 2FA rendra votre compte moins sécurisé.</p>
            </div>
          </div>

          <div className={styles.disableForm}>
            <div className={styles.formGroup}>
              <label>Code 2FA actuel</label>
              <div className={styles.codeInput}>
                <Key size={20} />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  maxLength={6}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={cancelSetup} className={styles.secondaryButton}>
              <X size={16} /> Annuler
            </button>
            <button
              onClick={disableTwoFactor}
              disabled={actionLoading || verificationCode.length !== 6 || !password}
              className={styles.dangerButton}
            >
              {actionLoading ? (
                <>
                  <Loader2 className={styles.spinner} size={16} /> Désactivation...
                </>
              ) : (
                <>
                  <ShieldOff size={16} /> Désactiver 2FA
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
