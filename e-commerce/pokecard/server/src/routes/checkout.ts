import { Router, type Request, type Response } from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient, OrderStatus } from '@prisma/client'
import Stripe from 'stripe'

const router = Router()
const prisma = new PrismaClient()

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, process.env.STRIPE_API_VERSION
      ? { apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion }
      : undefined)
  : null

const ensureStripeConfigured = () => {
  if (!stripe) {
    const error = new Error('Stripe n\'est pas configuré. Veuillez définir STRIPE_SECRET_KEY.')
    ;(error as any).code = 'STRIPE_NOT_CONFIGURED'
    throw error
  }

  return stripe
}

type CheckoutItemInput = {
  variantId: string
  quantity: number
}

const MAX_ITEMS = 50
const MAX_QUANTITY_PER_ITEM = 100
const MAX_TOTAL_QUANTITY = 500

router.post('/create-session', [
  body('items')
    .isArray({ min: 1, max: MAX_ITEMS })
    .withMessage(`La liste des articles est obligatoire (max ${MAX_ITEMS} articles).`),
  body('items.*.variantId')
    .isString()
    .notEmpty()
    .withMessage('L\'identifiant variante est obligatoire.')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('L\'identifiant variante contient des caractères invalides.'),
  body('items.*.quantity')
    .isInt({ min: 1, max: MAX_QUANTITY_PER_ITEM })
    .withMessage(`La quantité doit être entre 1 et ${MAX_QUANTITY_PER_ITEM}.`),
  body('customerEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('successUrl')
    .optional()
    .isString()
    .custom((value) => {
      if (!value) return true
      // Stripe permet {CHECKOUT_SESSION_ID} dans les URLs, donc on valide manuellement
      try {
        // Remplacer temporairement le placeholder pour valider l'URL de base
        const testUrl = value.replace('{CHECKOUT_SESSION_ID}', 'test-session-id')
        new URL(testUrl)
        return true
      } catch {
        throw new Error('URL de succès invalide')
      }
    }),
  body('cancelUrl')
    .optional()
    .isString()
    .custom((value) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        throw new Error('URL d\'annulation invalide')
      }
    })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const requestedItems: CheckoutItemInput[] = req.body.items
    
    // Vérifier la quantité totale
    const totalQuantity = requestedItems.reduce((sum, item) => sum + item.quantity, 0)
    if (totalQuantity > MAX_TOTAL_QUANTITY) {
      return res.status(400).json({
        error: `Quantité totale trop élevée (max ${MAX_TOTAL_QUANTITY} articles)`,
        code: 'QUANTITY_TOO_LARGE'
      })
    }

    // Dédupliquer les variantIds
    const variantIds = [...new Set(requestedItems.map((item) => item.variantId))]
    
    // Vérifier qu'on n'a pas de doublons (même variantId avec différentes quantités)
    if (variantIds.length !== requestedItems.length) {
      return res.status(400).json({
        error: 'Articles dupliqués détectés',
        code: 'DUPLICATE_ITEMS'
      })
    }

    const variants = await prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        isActive: true
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { position: 'asc' },
              take: 1
            }
          }
        }
      }
    })

    if (variants.length !== variantIds.length) {
      return res.status(400).json({
        error: 'Certains articles ne sont plus disponibles',
        code: 'VARIANT_NOT_FOUND'
      })
    }

    const variantsMap = new Map(variants.map((variant) => [variant.id, variant]))

    const validationErrors: Array<{ variantId: string; reason: string }> = []

    for (const item of requestedItems) {
      const variant = variantsMap.get(item.variantId)
      if (!variant) continue

      if (variant.stock <= 0) {
        validationErrors.push({ variantId: item.variantId, reason: 'OUT_OF_STOCK' })
      } else if (variant.stock < item.quantity) {
        validationErrors.push({ variantId: item.variantId, reason: 'INSUFFICIENT_STOCK' })
      }
    }

    if (validationErrors.length > 0) {
      return res.status(409).json({
        error: 'Stock insuffisant pour certains articles',
        code: 'INSUFFICIENT_STOCK',
        details: validationErrors
      })
    }

    const stripeClient = ensureStripeConfigured()

    // Validation des URLs de redirection (protection contre Open Redirect)
    const allowedDomainsRaw = process.env.ALLOWED_REDIRECT_DOMAINS?.split(',').map(d => d.trim()) || 
      (process.env.CHECKOUT_SUCCESS_URL ? [process.env.CHECKOUT_SUCCESS_URL] : [])
    
    // Extraire les origines des domaines autorisés
    const allowedOrigins = allowedDomainsRaw.map(domain => {
      try {
        return new URL(domain).origin
      } catch {
        // Si ce n'est pas une URL valide, essayer de la traiter comme une origine
        return domain
      }
    })

    const validateUrl = (url: string | undefined, defaultUrl: string | undefined): string => {
      if (!url) {
        if (!defaultUrl) {
          throw new Error('URL de redirection non configurée')
        }
        return defaultUrl
      }

      // En développement, permettre les URLs locales
      if (process.env.NODE_ENV === 'development' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return url
      }

      // Valider que l'URL appartient à un domaine autorisé
      try {
        // Stripe permet {CHECKOUT_SESSION_ID} dans les URLs, donc on le remplace temporairement pour la validation
        const testUrl = url.replace('{CHECKOUT_SESSION_ID}', 'test-session-id')
        const urlObj = new URL(testUrl)
        if (!allowedOrigins.includes(urlObj.origin)) {
          console.warn(`🚫 URL de redirection non autorisée: ${url} (origine: ${urlObj.origin}, autorisées: ${allowedOrigins.join(', ')})`)
          throw new Error('URL de redirection non autorisée')
        }
        return url
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error('URL de redirection invalide')
        }
        throw error
      }
    }

    const successUrl = validateUrl(req.body.successUrl, process.env.CHECKOUT_SUCCESS_URL)
    const cancelUrl = validateUrl(req.body.cancelUrl, process.env.CHECKOUT_CANCEL_URL)

    // Fonction pour convertir une URL relative en URL absolue
    const toAbsoluteUrl = (relativeUrl: string | null | undefined): string | undefined => {
      if (!relativeUrl) return undefined
      
      // Si c'est déjà une URL absolue (commence par http:// ou https://), la retourner telle quelle
      if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl
      }
      
      // Sinon, construire l'URL absolue à partir de l'origine du frontend
      try {
        // Utiliser l'origine de successUrl ou cancelUrl pour déterminer l'origine du frontend
        const frontendOrigin = successUrl ? new URL(successUrl.replace('{CHECKOUT_SESSION_ID}', 'test')).origin : 
                              cancelUrl ? new URL(cancelUrl).origin :
                              process.env.FRONTEND_URL || 'http://localhost:5173'
        
        // Si l'URL relative commence par /, l'ajouter directement à l'origine
        if (relativeUrl.startsWith('/')) {
          return `${frontendOrigin}${relativeUrl}`
        }
        
        // Sinon, l'ajouter avec un / entre l'origine et le chemin
        return `${frontendOrigin}/${relativeUrl}`
      } catch (error) {
        console.warn(`Impossible de convertir l'URL relative en URL absolue: ${relativeUrl}`, error)
        return undefined
      }
    }

    const lineItems = requestedItems.map((item) => {
      const variant = variantsMap.get(item.variantId)!
      const product = variant.product
      const primaryImage = product.images[0]?.url
      const absoluteImageUrl = toAbsoluteUrl(primaryImage)

      const nameParts = [product.name.trim()]
      if (variant.name.trim().toLowerCase() !== 'standard') {
        nameParts.push(variant.name.trim())
      }
      if (variant.language) {
        nameParts.push(`Langue: ${variant.language}`)
      }
      if (variant.edition) {
        nameParts.push(`Édition: ${variant.edition}`)
      }

      return {
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: variant.priceCents,
          product_data: {
            name: nameParts.join(' • '),
            images: absoluteImageUrl ? [absoluteImageUrl] : undefined
          }
        }
      }
    })

    const metadata = {
      items: JSON.stringify(requestedItems.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity
      })))
    }

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: req.body.customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      currency: 'eur',
      metadata,
      payment_intent_data: {
        metadata
      }
    })

    res.status(201).json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    console.error('Erreur lors de la création de la session Stripe:', error)

    // Ne pas exposer les détails d'erreur en production
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (error.code === 'STRIPE_NOT_CONFIGURED') {
      return res.status(500).json({
        error: 'Stripe n\'est pas configuré',
        code: 'STRIPE_NOT_CONFIGURED'
      })
    }

    // Gérer les erreurs de validation d'URL
    if (error.message?.includes('URL')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_REDIRECT_URL'
      })
    }

    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      ...(isDevelopment && { details: error.message })
    })
  }
})

const generateOrderNumber = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `POKE-${year}${month}${day}-${random}`
}

const parseMetadataItems = (metadata: Stripe.Metadata | null | undefined): CheckoutItemInput[] => {
  if (!metadata) return []

  const raw = metadata['items']
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => ({
        variantId: String(item.variantId),
        quantity: Number(item.quantity)
      }))
      .filter((item) => item.variantId && item.quantity > 0)
  } catch (error) {
    console.error('Impossible de parser le metadata items:', error)
    return []
  }
}

export const checkoutWebhookHandler = async (req: Request, res: Response) => {
  const stripeClient = ensureStripeConfigured()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Webhook Stripe non configuré: STRIPE_WEBHOOK_SECRET manquant')
    return res.status(500).send('Webhook non configuré')
  }

  const signature = req.headers['stripe-signature']
  if (!signature) {
    return res.status(400).send('Signature Stripe manquante')
  }

  let event: Stripe.Event

  try {
    const rawBody = (req as unknown as { body: Buffer }).body
    event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('Signature Stripe invalide:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const items = parseMetadataItems(session.metadata ?? null)

    if (items.length === 0) {
      console.warn('Session Stripe sans items, ignorée:', session.id)
      return res.status(200).json({ received: true })
    }

    const variantIds = items.map((item) => item.variantId)

    try {
      await prisma.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              include: {
                images: {
                  orderBy: { position: 'asc' },
                  take: 1
                }
              }
            }
          }
        })

        const variantsMap = new Map(variants.map((variant) => [variant.id, variant]))

        let totalCents = 0
        const currency = (session.currency ?? 'eur').toUpperCase()
        const paymentMethod = session.payment_method_types?.[0] ?? 'card'

        const orderItemsData = []

        for (const item of items) {
          const variant = variantsMap.get(item.variantId)
          if (!variant) {
            throw new Error(`Variant introuvable: ${item.variantId}`)
          }

          // Revalider le prix (protection contre la manipulation)
          // Le prix dans le webhook doit correspondre au prix stocké en DB
          const currentVariant = await tx.productVariant.findUnique({
            where: { id: variant.id }
          })

          if (!currentVariant) {
            throw new Error(`Variant introuvable lors de la validation: ${item.variantId}`)
          }

          // Utiliser le prix actuel de la DB (pas celui du cache)
          const actualPriceCents = currentVariant.priceCents

          // Vérifier le stock et décrémenter de manière atomique
          const updated = await tx.productVariant.updateMany({
            where: {
              id: variant.id,
              stock: { gte: item.quantity }
            },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          })

          if (updated.count === 0) {
            throw new Error(`Stock insuffisant pour la variante ${variant.id}`)
          }

          // Utiliser le prix actuel de la DB pour le calcul
          const lineTotal = actualPriceCents * item.quantity
          totalCents += lineTotal

          orderItemsData.push({
            productId: variant.productId,
            productVariantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name,
            imageUrl: variant.product.images[0]?.url ?? null,
            quantity: item.quantity,
            unitPriceCents: actualPriceCents, // Utiliser le prix actuel de la DB
            totalPriceCents: lineTotal
          })
        }

        const orderNumber = generateOrderNumber()
        const userId = session.metadata?.userId && session.metadata.userId.trim() !== ''
          ? session.metadata.userId
          : null

        await tx.order.create({
          data: {
            userId,
            orderNumber,
            status: OrderStatus.CONFIRMED,
            totalCents,
            currency,
            paymentMethod,
            billingAddress: session.customer_details ? {
              name: session.customer_details.name,
              email: session.customer_details.email,
              phone: session.customer_details.phone,
              address: session.customer_details.address
            } : null,
            shippingAddress: session.shipping_details ? {
              name: session.shipping_details.name,
              address: session.shipping_details.address
            } : null,
            items: {
              createMany: {
                data: orderItemsData
              }
            }
          }
        })
      })
    } catch (error: any) {
      console.error('Erreur lors du traitement du webhook Stripe:', error)
      // Ne pas exposer les détails d'erreur
      // Stripe retentera automatiquement en cas d'erreur 5xx
      return res.status(500).json({ 
        received: false,
        error: 'Erreur lors du traitement du webhook'
      })
    }
  }

  res.status(200).json({ received: true })
}

export default router

