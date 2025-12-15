import { useState, useEffect } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'

/**
 * Composant React pour lancer un paiement Stripe Checkout
 * 
 * Utilisation :
 * <CheckoutButton quantity={1} />
 * 
 * Props :
 * - quantity : Nombre de produits (défaut: 1)
 * - className : Classes CSS optionnelles
 * - disabled : Désactiver le bouton
 */
interface CheckoutButtonProps {
  quantity?: number
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
                                import.meta.env.REACT_APP_STRIPE_PUBLISHABLE_KEY

export function CheckoutButton({ 
  quantity = 1, 
  className = '', 
  disabled = false,
  children 
}: CheckoutButtonProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger Stripe avec la clé publique
  useEffect(() => {
    if (!STRIPE_PUBLISHABLE_KEY) {
      console.error('⚠️ VITE_STRIPE_PUBLISHABLE_KEY n\'est pas définie')
      setError('Stripe n\'est pas configuré')
      return
    }

    loadStripe(STRIPE_PUBLISHABLE_KEY)
      .then((stripeInstance) => {
        if (stripeInstance) {
          setStripe(stripeInstance)
        } else {
          setError('Impossible de charger Stripe')
        }
      })
      .catch((err) => {
        console.error('Erreur lors du chargement de Stripe:', err)
        setError('Erreur lors du chargement de Stripe')
      })
  }, [])

  /**
   * Gère le clic sur le bouton de paiement
   */
  const handleCheckout = async () => {
    if (!stripe) {
      setError('Stripe n\'est pas encore chargé')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Appeler le backend pour créer une session Checkout
      const response = await fetch(`${API_BASE}/checkout/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const { sessionId } = data

      if (!sessionId) {
        throw new Error('Session ID manquant dans la réponse')
      }

      // Rediriger vers Stripe Checkout
      const result = await stripe.redirectToCheckout({ sessionId })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (err: any) {
      console.error('Erreur lors du checkout:', err)
      setError(err.message || 'Une erreur est survenue lors du paiement')
    } finally {
      setLoading(false)
    }
  }

  // Si Stripe n'est pas chargé ou s'il y a une erreur de configuration
  if (error && !stripe) {
    return (
      <button 
        className={className} 
        disabled 
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        {children || 'Paiement indisponible'}
      </button>
    )
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading || !stripe}
      className={className}
      style={{
        opacity: (disabled || loading || !stripe) ? 0.6 : 1,
        cursor: (disabled || loading || !stripe) ? 'not-allowed' : 'pointer'
      }}
    >
      {loading ? 'Chargement...' : (children || 'Payer')}
      {error && (
        <div style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}
    </button>
  )
}

