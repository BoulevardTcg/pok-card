import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { API_BASE } from './api';
import styles from './ResetPasswordPage.module.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Vérification des paramètres
  const isValidParams = token && email;

  // Validation du mot de passe
  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères requis');
      return;
    }

    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirection automatique après succès
  useEffect(() => {
    if (isSuccess) {
      const timeout = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isSuccess, navigate]);

  // Écran d'erreur si paramètres manquants
  if (!isValidParams) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.errorIcon}>
                <AlertTriangle size={48} />
              </div>
              <h1 className={styles.title}>Lien invalide</h1>
              <div className={styles.divider}></div>
            </div>

            <div className={styles.errorContent}>
              <p>
                Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau
                lien.
              </p>
            </div>

            <div className={styles.footer}>
              <Link to="/forgot-password" className={styles.primaryLink}>
                Demander un nouveau lien
              </Link>
              <Link to="/login" className={styles.backLink}>
                <ArrowLeft size={16} />
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran de succès
  if (isSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.successIcon}>
                <CheckCircle size={48} />
              </div>
              <h1 className={styles.title}>Mot de passe modifié</h1>
              <div className={styles.divider}></div>
            </div>

            <div className={styles.successContent}>
              <p>
                Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la
                page de connexion...
              </p>
              <div className={styles.redirectIndicator}>
                <Loader2 className={styles.spinner} size={20} />
                <span>Redirection en cours...</span>
              </div>
            </div>

            <div className={styles.footer}>
              <Link to="/login" className={styles.primaryLink}>
                Se connecter maintenant
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.icon}>
              <Lock size={48} />
            </div>
            <h1 className={styles.title}>Nouveau mot de passe</h1>
            <div className={styles.divider}></div>
            <p className={styles.subtitle}>Choisissez un nouveau mot de passe sécurisé</p>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Nouveau mot de passe
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre nouveau mot de passe"
                  required
                  autoFocus
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Indicateurs de force */}
              <div className={styles.requirements}>
                <div className={passwordRequirements.minLength ? styles.met : styles.unmet}>
                  ✓ Au moins 8 caractères
                </div>
                <div className={passwordRequirements.hasUppercase ? styles.met : styles.unmet}>
                  ✓ Une majuscule
                </div>
                <div className={passwordRequirements.hasLowercase ? styles.met : styles.unmet}>
                  ✓ Une minuscule
                </div>
                <div className={passwordRequirements.hasNumber ? styles.met : styles.unmet}>
                  ✓ Un chiffre
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirmer le mot de passe
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  required
                  className={`${styles.input} ${confirmPassword && (passwordsMatch ? styles.inputValid : styles.inputInvalid)}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.passwordToggle}
                  aria-label={
                    showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <div className={styles.mismatch}>Les mots de passe ne correspondent pas</div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className={styles.submitButton}
            >
              {isLoading ? (
                <>
                  <Loader2 className={styles.spinner} size={18} />
                  Réinitialisation...
                </>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <Link to="/login" className={styles.backLink}>
              <ArrowLeft size={16} />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
