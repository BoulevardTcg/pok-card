import { useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from '../authContext';
import { CartContext } from '../cartContext';
import styles from './CheckoutAuth.module.css';

interface CheckoutAuthProps {
  onAuthenticated: () => void;
}

export function CheckoutAuth({ onAuthenticated }: CheckoutAuthProps) {
  const [mode, setMode] = useState<'choice' | 'login' | 'register'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login, register } = useAuth();
  const { cart, mergeCart } = useContext(CartContext);

  // Sauvegarder le panier actuel avant authentification pour le fusionner après
  // On utilise useRef pour capturer le panier au moment du montage du composant
  const guestCartRef = useRef<typeof cart>([]);

  useEffect(() => {
    // Capturer le panier invité au montage
    guestCartRef.current = [...cart];
  }, []); // Seulement au montage

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        // Fusionner le panier invité avec le panier utilisateur
        if (guestCartRef.current.length > 0) {
          mergeCart(guestCartRef.current);
        }
        onAuthenticated();
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err: any) {
      setError('Erreur inattendue: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre');
      return;
    }

    if (username.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(
        "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores"
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        email,
        username,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      if (result.success) {
        // Après inscription réussie, se connecter automatiquement
        const loginResult = await login(email, password);
        if (loginResult.success) {
          // Fusionner le panier invité avec le panier utilisateur
          if (guestCartRef.current.length > 0) {
            mergeCart(guestCartRef.current);
          }
          onAuthenticated();
        } else {
          setError('Compte créé mais erreur de connexion. Veuillez vous connecter.');
          setMode('login');
        }
      } else {
        setError(result.error || "Erreur lors de l'inscription");
      }
    } catch (err: any) {
      setError("Erreur inattendue lors de l'inscription: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'choice') {
    return (
      <div className={styles.checkoutAuth}>
        <div className={styles.header}>
          <h2 className={styles.title}>Finaliser votre commande</h2>
          <p className={styles.subtitle}>
            Créez un compte ou connectez-vous pour suivre votre commande et sécuriser votre paiement
          </p>
        </div>

        <div className={styles.benefits}>
          <div className={styles.benefit}>
            <span className={styles.benefitIcon}>📦</span>
            <span>Suivi de commande en temps réel</span>
          </div>
          <div className={styles.benefit}>
            <span className={styles.benefitIcon}>🔒</span>
            <span>Paiement sécurisé</span>
          </div>
          <div className={styles.benefit}>
            <span className={styles.benefitIcon}>💾</span>
            <span>Historique de vos achats</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => setMode('login')}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Se connecter
          </button>
          <button
            onClick={() => setMode('register')}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            Créer un compte
          </button>
        </div>

        <p className={styles.note}>
          Vous pouvez continuer sans compte, mais vous ne pourrez pas suivre votre commande.
        </p>
      </div>
    );
  }

  if (mode === 'login') {
    return (
      <div className={styles.checkoutAuth}>
        <div className={styles.header}>
          <button
            onClick={() => {
              setMode('choice');
              setError('');
            }}
            className={styles.backButton}
            aria-label="Retour"
          >
            ←
          </button>
          <h2 className={styles.title}>Se connecter</h2>
          <p className={styles.subtitle}>Connectez-vous pour finaliser votre commande</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="login-email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="login-password" className={styles.label}>
              Mot de passe
            </label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
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
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? 'Connexion...' : 'Se connecter et continuer'}
          </button>
        </form>

        <div className={styles.switchMode}>
          <p>
            Pas encore de compte ?{' '}
            <button
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={styles.link}
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Mode register
  return (
    <div className={styles.checkoutAuth}>
      <div className={styles.header}>
        <button
          onClick={() => {
            setMode('choice');
            setError('');
          }}
          className={styles.backButton}
          aria-label="Retour"
        >
          ←
        </button>
        <h2 className={styles.title}>Créer un compte</h2>
        <p className={styles.subtitle}>Créez votre compte pour finaliser votre commande</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleRegister} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="register-firstName" className={styles.label}>
              Prénom
            </label>
            <input
              type="text"
              id="register-firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="register-lastName" className={styles.label}>
              Nom
            </label>
            <input
              type="text"
              id="register-lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Votre nom"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="register-username" className={styles.label}>
            Nom d'utilisateur *
          </label>
          <input
            type="text"
            id="register-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="nom_utilisateur"
            required
            className={styles.input}
          />
          <small className={styles.hint}>
            Entre 3 et 30 caractères, lettres, chiffres, tirets et underscores uniquement
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="register-email" className={styles.label}>
            Email *
          </label>
          <input
            type="email"
            id="register-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="register-password" className={styles.label}>
            Mot de passe *
          </label>
          <div className={styles.passwordContainer}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="register-password"
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
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <small className={styles.hint}>
            Au moins 8 caractères, avec une minuscule, une majuscule et un chiffre
          </small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="register-confirmPassword" className={styles.label}>
            Confirmer le mot de passe *
          </label>
          <div className={styles.passwordContainer}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="register-confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              required
              className={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={styles.passwordToggle}
              aria-label={
                showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
              }
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={styles.submitButton}>
          {isLoading ? 'Création du compte...' : 'Créer mon compte et continuer'}
        </button>
      </form>

      <div className={styles.switchMode}>
        <p>
          Déjà un compte ?{' '}
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={styles.link}
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
