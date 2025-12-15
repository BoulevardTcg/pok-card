import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './authContext'
import './LoginPage.css'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.success) {
        navigate('/') // Rediriger vers la page d'accueil
      } else {
        setError(result.error || 'Erreur de connexion')
      }
    } catch (err) {
      setError('Erreur inattendue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setEmail('john.doe@example.com')
    setPassword('Test123!')
    
    // Attendre un peu pour que les champs se remplissent
    setTimeout(async () => {
      const result = await login('john.doe@example.com', 'Test123!')
      if (result.success) {
        navigate('/')
      }
    }, 100)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Connexion</h1>
          <p>Connectez-vous à votre compte BoulevardTCG</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                className="form-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="demo-login">
          <button
            onClick={handleDemoLogin}
            className="demo-button"
            disabled={isLoading}
          >
            🧪 Connexion de démonstration
          </button>
          <small>Utilisez les identifiants de test</small>
        </div>

        <div className="login-footer">
          <p>
            Pas encore de compte ?{' '}
            <Link to="/register" className="link">
              Créer un compte
            </Link>
          </p>
          <p>
            <Link to="/" className="link">
              ← Retour à l'accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
