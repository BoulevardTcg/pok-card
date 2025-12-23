import Stripe from 'stripe'

/**
 * Configuration Stripe
 * 
 * Initialise et exporte une instance Stripe configurée avec la clé secrète
 * et une version d'API récente pour garantir la compatibilité.
 * 
 * Variables d'environnement requises :
 * - STRIPE_SECRET_KEY : Clé secrète Stripe (sk_test_... ou sk_live_...)
 * - STRIPE_API_VERSION (optionnel) : Version de l'API Stripe à utiliser
 */
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY n\'est pas définie. Les fonctionnalités Stripe ne fonctionneront pas.')
}

// Créer l'instance Stripe avec la version d'API spécifiée ou une version récente par défaut
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) || '2024-06-20',
    })
  : null

/**
 * Vérifie que Stripe est configuré
 * @throws {Error} Si Stripe n'est pas configuré
 */
export const ensureStripeConfigured = (): Stripe => {
  if (!stripe) {
    const error = new Error('Stripe n\'est pas configuré. Veuillez définir STRIPE_SECRET_KEY.')
    ;(error as any).code = 'STRIPE_NOT_CONFIGURED'
    throw error
  }
  return stripe
}

