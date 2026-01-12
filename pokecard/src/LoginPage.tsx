import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './authContext';
import { Shield, Key, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate('/');
      } else if (result.requiresTwoFactor) {
        // 2FA requis, afficher le formulaire 2FA
        setRequiresTwoFactor(true);
        setPendingEmail(result.email || email);
        setError(result.error || '');
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err: any) {
      setError('Erreur inattendue: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(pendingEmail, password, twoFactorCode);

      if (result.success) {
        navigate('/');
      } else if (result.requiresTwoFactor) {
        setError(result.error || 'Code 2FA invalide');
        setTwoFactorCode('');
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err: any) {
      console.error(err);
      setError('Erreur inattendue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false);
    setTwoFactorCode('');
    setError('');
  };

  // Formulaire 2FA
  if (requiresTwoFactor) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div className={styles.twoFactorIcon}>
                <Shield size={48} />
              </div>
              <h1 className={styles.title}>Vérification 2FA</h1>
              <div className={styles.divider}></div>
              <p className={styles.subtitle}>
                Entrez le code à 6 chiffres de votre application d'authentification
              </p>
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            <form onSubmit={handleTwoFactorSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="twoFactorCode" className={styles.label}>
                  <Key size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
                  Code d'authentification
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className={`${styles.input} ${styles.twoFactorInput}`}
                />
                <small className={styles.helperText}>
                  Ouvrez Google Authenticator, Authy ou votre application 2FA
                </small>
              </div>

              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    Vérification...
                  </>
                ) : (
                  'Vérifier'
                )}
              </button>
            </form>

            <div className={styles.footer}>
              <button onClick={handleBackToLogin} className={styles.backButton}>
                <ArrowLeft size={16} />
                Retour à la connexion
              </button>
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
            <h1 className={styles.title}>Connexion</h1>
            <div className={styles.divider}></div>
            <p className={styles.subtitle}>Connectez-vous à votre compte BoulevardTCG</p>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Mot de passe
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className={styles.forgotPassword}>
                <Link to="/forgot-password" className={styles.forgotPasswordLink}>
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={styles.submitButton}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Pas encore de compte ?{' '}
              <Link to="/register" className={styles.link}>
                Créer un compte
              </Link>
            </p>
            <p className={styles.footerText}>
              <Link to="/" className={styles.link}>
                ← Retour à l'accueil
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
