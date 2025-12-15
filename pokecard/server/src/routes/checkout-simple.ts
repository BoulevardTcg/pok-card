import { Router, type Request, type Response } from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient, OrderStatus } from '@prisma/client'
import { ensureStripeConfigured } from '../config/stripe.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

/**
 * Route simplifiée pour créer une session Checkout Stripe
 * 
 * POST /api/checkout/create-checkout-session
 * 
 * Body JSON attendu :
 * {
 *   "quantity": 1  // Quantité de produits (simple pour commencer)
 * }
 * 
 * Optionnel : peut être étendu pour accepter productId ou un panier
 */
router.post('/create-checkout-session', [
  // Validation simple : juste la quantité
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La quantité doit être entre 1 et 100'),
], optionalAuth, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const quantity = req.body.quantity || 1
    const userId = req.user?.userId // Récupérer l'utilisateur depuis le JWT si disponible

    const stripeClient = ensureStripeConfigured()

    // Configuration des URLs de redirection
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const successUrl = `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${frontendUrl}/panier`

    // Créer une session Checkout Stripe simple
    // Pour l'instant, on utilise un produit générique
    // Plus tard, on pourra passer un productId dans le body
    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: quantity,
          price_data: {
            currency: 'eur',
            unit_amount: 1999, // 19,99 € en centimes (exemple)
            product_data: {
              name: 'Commande Boulevard TCG',
              description: 'Produit TCG - Commande personnalisée'
            }
          }
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      currency: 'eur',
      // Ajouter l'email du client si l'utilisateur est connecté
      customer_email: req.user?.email || req.body.customerEmail,
      // Ajouter l'ID utilisateur dans les métadonnées pour le webhook
      metadata: {
        userId: userId || '',
        quantity: String(quantity)
      },
      // Référence client pour retrouver la commande plus tard
      client_reference_id: userId || undefined
    })

    // Retourner l'ID de session et l'URL
    res.status(201).json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Erreur lors de la création de la session Stripe:', error)

    // Gérer les erreurs spécifiques
    if (error.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(500).json({
        error: 'Stripe n\'est pas configuré',
        code: 'STRIPE_NOT_CONFIGURED'
      })
    }

    // Ne pas exposer les détails d'erreur en production
    const isDevelopment = process.env.NODE_ENV === 'development'
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      ...(isDevelopment && { details: error.message })
    })
  }
})

export default router

