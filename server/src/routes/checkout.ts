import { Router, type Request, type Response } from 'express';
import { body, validationResult } from 'express-validator';
import { OrderStatus, Prisma, FulfillmentStatus, OrderEventType, Carrier } from '@prisma/client';
import prisma from '../lib/prisma.js';
import Stripe from 'stripe';
import { ensureStripeConfigured } from '../config/stripe.js';
import { optionalAuth } from '../middleware/auth.js';
import { sendOrderConfirmationEmail } from '../services/email.js';
import { findShippingMethod } from '../config/shipping.js';
import { releaseAllForOwner } from '../services/reservationService.js';
import { getOwnerKey, getOrCreateCartId } from '../utils/cartId.js';

const router = Router();

function createUrlValidator(allowedOrigins: string[]) {
  return (url: string | undefined, defaultUrl: string | undefined): string => {
    if (!url) {
      if (!defaultUrl) {
        throw new Error('URL de redirection non configurée');
      }
      return defaultUrl;
    }

    if (
      process.env.NODE_ENV === 'development' &&
      (url.includes('localhost') || url.includes('127.0.0.1'))
    ) {
      return url;
    }

    try {
      const testUrl = url.replace('{CHECKOUT_SESSION_ID}', 'test-session-id');
      const urlObj = new URL(testUrl);
      if (!allowedOrigins.includes(urlObj.origin)) {
        console.warn(
          `🚫 URL de redirection non autorisée: ${url} (origine: ${urlObj.origin}, autorisées: ${allowedOrigins.join(', ')})`
        );
        throw new Error('URL de redirection non autorisée');
      }
      return url;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('URL de redirection invalide');
      }
      throw error;
    }
  };
}

async function createOrderFromSession(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session,
  items: CheckoutItemInput[],
  sessionId: string,
  userId: string | null
) {
  const customerEmailFromForm = session.metadata?.customerEmail || session.customer_details?.email;
  const variantIds = items.map((item) => item.variantId);

  const variants = await tx.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        include: {
          images: {
            orderBy: { position: 'asc' },
            take: 1,
          },
        },
      },
    },
  });

  const variantsMap = new Map(variants.map((variant) => [variant.id, variant]));
  let totalCents = 0;
  const currency = (session.currency ?? 'eur').toUpperCase();
  const shippingPriceCents = session.metadata?.shippingPriceCents
    ? parseInt(session.metadata.shippingPriceCents) || 0
    : 0;
  const shippingMethodCode = session.metadata?.shippingMethodCode ?? null;
  const shippingCarrier = Object.values(Carrier).includes(
    session.metadata?.shippingCarrier as Carrier
  )
    ? (session.metadata?.shippingCarrier as Carrier)
    : null;

  const orderItemsData = [];

  for (const item of items) {
    const variant = variantsMap.get(item.variantId);
    if (!variant) {
      throw new Error(`Variant introuvable: ${item.variantId}`);
    }

    // Vérifier le stock et décrémenter
    const updated = await tx.productVariant.updateMany({
      where: {
        id: variant.id,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (updated.count === 0) {
      throw new Error(`Stock insuffisant pour la variante ${variant.id}`);
    }

    const lineTotal = variant.priceCents * item.quantity;
    totalCents += lineTotal;

    orderItemsData.push({
      productId: variant.productId,
      productVariantId: variant.id,
      productName: variant.product.name,
      variantName: variant.name,
      imageUrl: variant.product.images[0]?.url ?? null,
      quantity: item.quantity,
      unitPriceCents: variant.priceCents,
      totalPriceCents: lineTotal,
    });
  }

  totalCents += shippingPriceCents;
  const orderNumber = generateOrderNumber();

  const createdOrder = await tx.order.create({
    data: {
      userId,
      orderNumber,
      status: OrderStatus.CONFIRMED,
      fulfillmentStatus: FulfillmentStatus.PAID,
      totalCents,
      currency,
      paymentMethod: sessionId,
      shippingMethod: shippingMethodCode ?? undefined,
      shippingCost: shippingPriceCents || undefined,
      carrier: shippingCarrier ?? undefined,
      billingAddress: (() => {
        const billing = buildBillingAddress(session.customer_details) as any;
        // Forcer l'email du formulaire si disponible dans les métadonnées
        if (customerEmailFromForm && billing) {
          billing.email = customerEmailFromForm;
        }
        return billing;
      })(),
      shippingAddress: buildShippingAddress(session.shipping_details),
      events: {
        create: [
          {
            type: OrderEventType.PAID,
            message: 'Paiement confirmé via Stripe',
            createdBy: userId ?? undefined,
          },
        ],
      },
      items: {
        createMany: {
          data: orderItemsData,
        },
      },
    },
  });

  return createdOrder;
}

// Export pour les tests
export async function processCompletedCheckoutSession(session: Stripe.Checkout.Session) {
  const customerEmailFromForm = session.metadata?.customerEmail || session.customer_details?.email;
  const items = parseMetadataItems(session.metadata ?? null);

  if (items.length === 0) {
    console.warn('Session Stripe sans items, ignorée:', session.id);
    return;
  }

  const variantIds = items.map((item) => item.variantId);
  const userId =
    session.metadata?.userId && session.metadata.userId.trim() !== ''
      ? session.metadata.userId
      : null;

  // STRATÉGIE: Récupérer ownerKey depuis les metadata pour libérer les réservations
  const ownerKey = session.metadata?.ownerKey || (userId ? `user:${userId}` : null);
  if (!ownerKey) {
    console.warn('⚠️ Webhook: ownerKey manquant dans metadata, utilisation userId uniquement', {
      sessionId: session.id,
      userId,
    });
  }

  await prisma.$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: {
              orderBy: { position: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    const variantsMap = new Map(variants.map((variant) => [variant.id, variant]));
    let totalCents = 0;
    const currency = (session.currency ?? 'eur').toUpperCase();
    const paymentMethod = session.payment_method_types?.[0] ?? 'card';
    const shippingPriceCents = session.metadata?.shippingPriceCents
      ? parseInt(session.metadata.shippingPriceCents) || 0
      : 0;
    const shippingMethodCode = session.metadata?.shippingMethodCode ?? null;
    const shippingCarrier = Object.values(Carrier).includes(
      session.metadata?.shippingCarrier as Carrier
    )
      ? (session.metadata?.shippingCarrier as Carrier)
      : null;

    const orderItemsData = [];

    // STRATÉGIE: Vérifier que les réservations (HOLD) existent et couvrent les quantités
    // avant de décrémenter le stock (double vérification de sécurité)
    if (ownerKey) {
      const existingReservations = await tx.cartReservation.findMany({
        where: {
          ownerKey,
          variantId: { in: variantIds },
          expiresAt: { gt: new Date() },
        },
      });

      const reservationMap = new Map(existingReservations.map((r) => [r.variantId, r.quantity]));

      // Vérifier que toutes les quantités sont couvertes
      for (const item of items) {
        const held = reservationMap.get(item.variantId) || 0;
        if (held < item.quantity) {
          console.error(
            `⚠️ Webhook: Réservation insuffisante pour ${item.variantId} (held: ${held}, requested: ${item.quantity})`
          );
          throw new Error(`Réservation insuffisante pour la variante ${item.variantId}`);
        }
      }
    }

    for (const item of items) {
      const variant = variantsMap.get(item.variantId);
      if (!variant) {
        throw new Error(`Variant introuvable: ${item.variantId}`);
      }

      const currentVariant = await tx.productVariant.findUnique({
        where: { id: variant.id },
      });

      if (!currentVariant) {
        throw new Error(`Variant introuvable lors de la validation: ${item.variantId}`);
      }

      const actualPriceCents = currentVariant.priceCents;

      // STRATÉGIE: Décrémenter le stock atomiquement (dans la transaction)
      const updated = await tx.productVariant.updateMany({
        where: {
          id: variant.id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count === 0) {
        throw new Error(`Stock insuffisant pour la variante ${variant.id}`);
      }

      const lineTotal = actualPriceCents * item.quantity;
      totalCents += lineTotal;

      orderItemsData.push({
        productId: variant.productId,
        productVariantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        imageUrl: variant.product.images[0]?.url ?? null,
        quantity: item.quantity,
        unitPriceCents: actualPriceCents,
        totalPriceCents: lineTotal,
      });
    }

    totalCents += shippingPriceCents;
    const orderNumber = generateOrderNumber();

    await tx.order.create({
      data: {
        userId,
        orderNumber,
        status: OrderStatus.CONFIRMED,
        fulfillmentStatus: FulfillmentStatus.PAID,
        shippingMethod: shippingMethodCode ?? undefined,
        shippingCost: shippingPriceCents || undefined,
        carrier: shippingCarrier ?? undefined,
        totalCents,
        currency,
        paymentMethod,
        billingAddress: (() => {
          const billing = buildBillingAddress(session.customer_details) as any;
          // Forcer l'email du formulaire si disponible dans les métadonnées
          if (customerEmailFromForm && billing) {
            billing.email = customerEmailFromForm;
          }
          return billing;
        })(),
        shippingAddress: buildShippingAddress(session.shipping_details),
        events: {
          create: [
            {
              type: OrderEventType.PAID,
              message: 'Paiement confirmé via Stripe',
              createdBy: userId ?? undefined,
            },
          ],
        },
        items: {
          createMany: {
            data: orderItemsData,
          },
        },
      },
    });

    // STRATÉGIE: Supprimer les réservations (HOLD) dans la même transaction
    // après avoir créé la commande et décrémenté le stock
    if (ownerKey) {
      await tx.cartReservation.deleteMany({
        where: {
          ownerKey,
          variantId: { in: variantIds },
        },
      });
      console.log(
        `✅ Réservations (HOLD) supprimées pour ownerKey ${ownerKey} après commande validée`
      );
    }
  });
}

async function validateAndApplyPromoCode(
  promoCodeInput: string | undefined,
  totalCents: number
): Promise<{ promoDiscount: number; appliedPromoCode: string | null }> {
  let promoDiscount = 0;
  let appliedPromoCode: string | null = null;

  if (!promoCodeInput) {
    return { promoDiscount, appliedPromoCode };
  }

  const now = new Date();
  const promoCodeRecord = await prisma.promoCode.findUnique({
    where: { code: promoCodeInput },
  });

  if (!promoCodeRecord || !promoCodeRecord.isActive) {
    return { promoDiscount, appliedPromoCode };
  }

  if (now < promoCodeRecord.validFrom || now > promoCodeRecord.validUntil) {
    return { promoDiscount, appliedPromoCode };
  }

  if (promoCodeRecord.minPurchase && totalCents < promoCodeRecord.minPurchase) {
    return { promoDiscount, appliedPromoCode };
  }

  if (promoCodeRecord.usageLimit && promoCodeRecord.usedCount >= promoCodeRecord.usageLimit) {
    return { promoDiscount, appliedPromoCode };
  }

  if (promoCodeRecord.type === 'PERCENTAGE') {
    promoDiscount = Math.floor((totalCents * promoCodeRecord.value) / 100);
    if (promoCodeRecord.maxDiscount) {
      promoDiscount = Math.min(promoDiscount, promoCodeRecord.maxDiscount);
    }
  } else {
    promoDiscount = promoCodeRecord.value;
  }
  appliedPromoCode = promoCodeRecord.code;

  await prisma.promoCode.update({
    where: { code: promoCodeRecord.code },
    data: { usedCount: { increment: 1 } },
  });

  return { promoDiscount, appliedPromoCode };
}

type CheckoutItemInput = {
  variantId: string;
  quantity: number;
};

const MAX_ITEMS = 50;
const MAX_QUANTITY_PER_ITEM = 100;
const MAX_TOTAL_QUANTITY = 500;

const serializeStripeAddress = (
  address: Stripe.Address | null | undefined
): Prisma.InputJsonValue | null => {
  if (!address) return null;

  return {
    city: address.city ?? null,
    country: address.country ?? null,
    line1: address.line1 ?? null,
    line2: address.line2 ?? null,
    postal_code: address.postal_code ?? null,
    state: address.state ?? null,
  };
};

const buildBillingAddress = (
  details: Stripe.Checkout.Session.CustomerDetails | null | undefined
): Prisma.InputJsonValue | undefined => {
  if (!details) return undefined;

  return {
    name: details.name ?? null,
    email: details.email ?? null,
    phone: details.phone ?? null,
    address: serializeStripeAddress(details.address),
  };
};

const buildShippingAddress = (
  details: Stripe.Checkout.Session.ShippingDetails | null | undefined
): Prisma.InputJsonValue | undefined => {
  if (!details) return undefined;

  return {
    name: details.name ?? null,
    address: serializeStripeAddress(details.address),
  };
};

/**
 * POST /api/checkout/hold
 * STRATÉGIE: HOLD au checkout uniquement (TTL 10 minutes par défaut)
 * Crée des réservations pour tout le panier avant le paiement Stripe
 *
 * Body: { items: [{ variantId: string; quantity: number }], ttlMinutes?: number }
 *
 * Retourne: { ok: true, expiresAt: ISO, holdTtlMinutes: number, items: [{variantId, quantityHeld}] }
 * Erreur 409: { ok: false, code: "OUT_OF_STOCK", details: [{variantId, available, requested}] }
 */
router.post(
  '/hold',
  optionalAuth,
  [
    body('items')
      .isArray({ min: 1, max: MAX_ITEMS })
      .withMessage(`La liste des articles est obligatoire (max ${MAX_ITEMS} articles).`),
    body('items.*.variantId')
      .isString()
      .notEmpty()
      .withMessage("L'identifiant variante est obligatoire."),
    body('items.*.quantity')
      .isInt({ min: 1, max: MAX_QUANTITY_PER_ITEM })
      .withMessage(`La quantité doit être entre 1 et ${MAX_QUANTITY_PER_ITEM}.`),
    body('ttlMinutes')
      .optional()
      .isInt({ min: 1, max: 60 })
      .withMessage('ttlMinutes doit être entre 1 et 60'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array(),
        });
      }

      const { items, ttlMinutes = 10 } = req.body as {
        items: CheckoutItemInput[];
        ttlMinutes?: number;
      };

      // CRITIQUE 1: Utiliser cartId même si connecté pour garantir stabilité entre /hold et /create-session
      // Pendant le checkout, on force l'ownerKey basé sur cartId pour éviter les bascules user:* ↔ cart:*
      const cartId = getOrCreateCartId(req, res);
      const ownerKey = `cart:${cartId}`;

      const variantIds = items.map((item) => item.variantId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

      // Transaction atomique pour créer les réservations
      const result = await prisma.$transaction(async (tx) => {
        // 1. Récupérer les variants et vérifier qu'ils existent
        const variants = await tx.productVariant.findMany({
          where: {
            id: { in: variantIds },
            isActive: true,
          },
        });

        if (variants.length !== variantIds.length) {
          const foundIds = new Set(variants.map((v) => v.id));
          const missing = variantIds.filter((id) => !foundIds.has(id));
          throw new Error(`Variantes introuvables: ${missing.join(', ')}`);
        }

        // 2. Calculer les réservations actives globales (tous owners sauf cet ownerKey)
        const globalReservations = await tx.cartReservation.groupBy({
          by: ['variantId'],
          where: {
            variantId: { in: variantIds },
            expiresAt: { gt: now },
            NOT: { ownerKey }, // Exclure les réservations de cet ownerKey
          },
          _sum: {
            quantity: true,
          },
        });

        const globalReservedMap = new Map(
          globalReservations.map((r) => [r.variantId, r._sum.quantity || 0])
        );

        // 3. Vérifier le stock disponible pour chaque item et créer les réservations
        const holdResults: Array<{ variantId: string; quantityHeld: number }> = [];
        const stockErrors: Array<{ variantId: string; available: number; requested: number }> = [];

        for (const item of items) {
          const variant = variants.find((v) => v.id === item.variantId);
          if (!variant) continue;

          const globalReserved = globalReservedMap.get(item.variantId) || 0;
          const available = Math.max(0, variant.stock - globalReserved);

          if (available < item.quantity) {
            stockErrors.push({
              variantId: item.variantId,
              available,
              requested: item.quantity,
            });
          } else {
            // Upsert la réservation pour cet ownerKey et variantId
            await tx.cartReservation.upsert({
              where: {
                variantId_ownerKey: {
                  variantId: item.variantId,
                  ownerKey,
                },
              },
              create: {
                variantId: item.variantId,
                ownerKey,
                quantity: item.quantity,
                expiresAt,
              },
              update: {
                quantity: item.quantity,
                expiresAt, // Mettre à jour l'expiration
              },
            });

            holdResults.push({
              variantId: item.variantId,
              quantityHeld: item.quantity,
            });
          }
        }

        // Si des erreurs de stock, throw 409
        if (stockErrors.length > 0) {
          const error: any = new Error('Stock insuffisant pour certains articles');
          error.code = 'OUT_OF_STOCK';
          error.details = stockErrors;
          throw error;
        }

        return { holdResults, expiresAt, ttlMinutes };
      });

      res.status(200).json({
        ok: true,
        expiresAt: result.expiresAt.toISOString(),
        holdTtlMinutes: result.ttlMinutes,
        items: result.holdResults,
      });
    } catch (error: any) {
      console.error('Erreur lors du HOLD checkout:', error);

      if (error.code === 'OUT_OF_STOCK') {
        return res.status(409).json({
          ok: false,
          code: 'OUT_OF_STOCK',
          error: 'Stock insuffisant pour certains articles',
          details: error.details || [],
        });
      }

      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

router.post(
  '/create-session',
  [
    body('items')
      .isArray({ min: 1, max: MAX_ITEMS })
      .withMessage(`La liste des articles est obligatoire (max ${MAX_ITEMS} articles).`),
    body('items.*.variantId')
      .isString()
      .notEmpty()
      .withMessage("L'identifiant variante est obligatoire.")
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage("L'identifiant variante contient des caractères invalides."),
    body('items.*.quantity')
      .isInt({ min: 1, max: MAX_QUANTITY_PER_ITEM })
      .withMessage(`La quantité doit être entre 1 et ${MAX_QUANTITY_PER_ITEM}.`),
    body('customerEmail').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
    body('successUrl')
      .optional()
      .isString()
      .custom((value) => {
        if (!value) return true;
        try {
          const testUrl = value.replace('{CHECKOUT_SESSION_ID}', 'test-session-id');
          new URL(testUrl);
          return true;
        } catch {
          throw new Error('URL de succès invalide');
        }
      }),
    body('cancelUrl')
      .optional()
      .isString()
      .custom((value) => {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          throw new Error("URL d'annulation invalide");
        }
      }),
    body('promoCode')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Code promo invalide'),
    body('shipping')
      .exists()
      .withMessage('Adresse de livraison requise.')
      .custom((value) => typeof value === 'object' && value !== null)
      .withMessage('Adresse de livraison invalide.'),
    body('shipping.fullName').isString().notEmpty().withMessage('Nom complet requis.'),
    body('shipping.addressLine1').isString().notEmpty().withMessage('Adresse requise.'),
    body('shipping.postalCode').isString().notEmpty().withMessage('Code postal requis.'),
    body('shipping.city').isString().notEmpty().withMessage('Ville requise.'),
    body('shipping.country').isString().notEmpty().withMessage('Pays requis.'),
    body('shipping.phone')
      .optional()
      .isString()
      .isLength({ max: 30 })
      .withMessage('Téléphone invalide'),
    body('shippingMethodCode').isString().notEmpty().withMessage('Mode de livraison requis'),
  ],
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array(),
        });
      }

      const requestedItems: CheckoutItemInput[] = req.body.items;
      const shipping = req.body.shipping || {};
      const shippingMethodCode = (req.body.shippingMethodCode || '')
        .toString()
        .trim()
        .toUpperCase();
      const shippingMethod = findShippingMethod(shippingMethodCode);

      if (!shippingMethod) {
        return res.status(400).json({
          error: 'Mode de livraison invalide',
          code: 'INVALID_SHIPPING_METHOD',
        });
      }

      const totalQuantity = requestedItems.reduce((sum, item) => sum + item.quantity, 0);
      if (totalQuantity > MAX_TOTAL_QUANTITY) {
        return res.status(400).json({
          error: `Quantité totale trop élevée (max ${MAX_TOTAL_QUANTITY} articles)`,
          code: 'QUANTITY_TOO_LARGE',
        });
      }

      const variantIds = [...new Set(requestedItems.map((item) => item.variantId))];

      if (variantIds.length !== requestedItems.length) {
        return res.status(400).json({
          error: 'Articles dupliqués détectés',
          code: 'DUPLICATE_ITEMS',
        });
      }

      // CRITIQUE 1: Utiliser cartId même si connecté pour garantir stabilité entre /hold et /create-session
      // Pendant le checkout, on force l'ownerKey basé sur cartId pour éviter les bascules user:* ↔ cart:*
      const cartId = getOrCreateCartId(req, res);
      const ownerKey = `cart:${cartId}`;
      const now = new Date();

      // STRATÉGIE: Vérifier que les réservations (HOLD) existent pour cet ownerKey
      // Le frontend doit avoir appelé /checkout/hold avant /create-session
      let existingReservations: Array<{ variantId: string; quantity: number }> = [];
      try {
        existingReservations = await prisma.cartReservation.findMany({
          where: {
            ownerKey,
            variantId: { in: variantIds },
            expiresAt: { gt: now },
          },
        });
      } catch (error: any) {
        // Si la table n'existe pas (P2021), considérer qu'il n'y a pas de réservations
        // Cela déclenchera une erreur HOLD_EXPIRED, ce qui est cohérent
        if (error?.code !== 'P2021') {
          throw error;
        }
      }

      const reservationMap = new Map(existingReservations.map((r) => [r.variantId, r.quantity]));

      // Vérifier que toutes les quantités demandées sont couvertes par les réservations
      const missingReservations: Array<{ variantId: string; requested: number; held: number }> = [];
      for (const item of requestedItems) {
        const held = reservationMap.get(item.variantId) || 0;
        if (held < item.quantity) {
          missingReservations.push({
            variantId: item.variantId,
            requested: item.quantity,
            held,
          });
        }
      }

      if (missingReservations.length > 0) {
        return res.status(409).json({
          error: 'Votre réservation a expiré, veuillez réessayer',
          code: 'HOLD_EXPIRED',
          details: missingReservations,
        });
      }

      // Récupérer les variants uniquement pour les prix et infos produit (pas pour vérifier le stock)
      const variants = await prisma.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
        },
        include: {
          product: {
            include: {
              images: {
                orderBy: { position: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      if (variants.length !== variantIds.length) {
        return res.status(400).json({
          error: 'Certains articles ne sont plus disponibles',
          code: 'VARIANT_NOT_FOUND',
        });
      }

      const variantsMap = new Map(variants.map((variant) => [variant.id, variant]));

      const stripeClient = ensureStripeConfigured();

      const allowedDomainsRaw =
        process.env.ALLOWED_REDIRECT_DOMAINS?.split(',').map((d) => d.trim()) ||
        (process.env.CHECKOUT_SUCCESS_URL ? [process.env.CHECKOUT_SUCCESS_URL] : []);

      const allowedOrigins = allowedDomainsRaw.map((domain) => {
        try {
          return new URL(domain).origin;
        } catch {
          return domain;
        }
      });

      const validateUrl = createUrlValidator(allowedOrigins);

      const successUrl = validateUrl(req.body.successUrl, process.env.CHECKOUT_SUCCESS_URL);
      const cancelUrl = validateUrl(req.body.cancelUrl, process.env.CHECKOUT_CANCEL_URL);

      const toAbsoluteUrl = (relativeUrl: string | null | undefined): string | undefined => {
        if (!relativeUrl) return undefined;

        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
          return encodeURI(relativeUrl);
        }

        try {
          // Utiliser l'origine de successUrl ou cancelUrl pour déterminer l'origine du frontend
          const frontendOrigin = successUrl
            ? new URL(successUrl.replace('{CHECKOUT_SESSION_ID}', 'test')).origin
            : cancelUrl
              ? new URL(cancelUrl).origin
              : (
                  process.env.FRONTEND_PUBLIC_URL ||
                  process.env.FRONTEND_URL ||
                  'http://localhost:3000'
                ).replace(/\/$/, '');

          // Si l'URL relative commence par /, l'ajouter directement à l'origine
          if (relativeUrl.startsWith('/')) {
            return encodeURI(`${frontendOrigin}${relativeUrl}`);
          }

          // Sinon, l'ajouter avec un / entre l'origine et le chemin
          return encodeURI(`${frontendOrigin}/${relativeUrl}`);
        } catch (error) {
          console.warn(
            `Impossible de convertir l'URL relative en URL absolue: ${relativeUrl}`,
            error
          );
          return undefined;
        }
      };

      // Calculer le total pour valider le code promo
      let totalCents = 0;
      for (const item of requestedItems) {
        const variant = variantsMap.get(item.variantId)!;
        totalCents += variant.priceCents * item.quantity;
      }

      // Valider et appliquer le code promo si fourni
      const promoResult = await validateAndApplyPromoCode(
        req.body.promoCode?.toUpperCase(),
        totalCents
      );
      const { promoDiscount, appliedPromoCode } = promoResult;

      const lineItems = requestedItems.map((item) => {
        const variant = variantsMap.get(item.variantId)!;
        const product = variant.product;
        const primaryImage = product.images[0]?.url;
        const absoluteImageUrl = toAbsoluteUrl(primaryImage);

        const nameParts = [product.name.trim()];
        if (variant.name.trim().toLowerCase() !== 'standard') {
          nameParts.push(variant.name.trim());
        }
        if (variant.language) {
          nameParts.push(`Langue: ${variant.language}`);
        }
        if (variant.edition) {
          nameParts.push(`Édition: ${variant.edition}`);
        }

        return {
          quantity: item.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: variant.priceCents,
            product_data: {
              name: nameParts.join(' • '),
              images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
            },
          },
        };
      });

      // Ajouter la ligne de livraison
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: shippingMethod.priceCents,
          product_data: {
            name: `Livraison – ${shippingMethod.label}`,
            images: [],
          },
        },
      });

      // Créer un coupon Stripe si un code promo est appliqué
      let stripeCouponId: string | null = null;
      if (promoDiscount > 0 && appliedPromoCode) {
        try {
          // Créer un coupon unique pour cette session
          const coupon = await stripeClient.coupons.create({
            amount_off: promoDiscount,
            currency: 'eur',
            name: `Code promo ${appliedPromoCode}`,
            max_redemptions: 1, // Usage unique
            redeem_by: Math.floor(Date.now() / 1000) + 3600, // Expire dans 1h
          });
          stripeCouponId = coupon.id;
        } catch (couponError) {
          console.error('Erreur lors de la creation du coupon Stripe:', couponError);
          // Continuer sans le coupon plutot que d'echouer completement
        }
      }

      // CRITIQUE 4: Vérifier que ownerKey n'est pas null/undefined (déjà garanti par getOrCreateCartId)
      // Note: cartId et ownerKey sont déjà déclarés plus haut (ligne 726-727)
      if (!ownerKey || !cartId) {
        return res.status(500).json({
          error: 'Erreur interne: cartId manquant',
          code: 'INTERNAL_ERROR',
        });
      }

      const metadata: Record<string, string> = {
        items: JSON.stringify(
          requestedItems.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))
        ),
        shippingMethodCode,
        shippingPriceCents: String(shippingMethod.priceCents),
        shippingCarrier: shippingMethod.carrier,
        shippingFullName: shipping.fullName,
        shippingAddress1: shipping.addressLine1,
        ...(shipping.addressLine2 ? { shippingAddress2: shipping.addressLine2 } : {}),
        shippingPostalCode: shipping.postalCode,
        shippingCity: shipping.city,
        shippingCountry: shipping.country,
        ...(shipping.phone ? { shippingPhone: shipping.phone } : {}),
        // Stocker l'email du formulaire pour l'utiliser dans l'email de confirmation
        ...(req.body.customerEmail ? { customerEmail: req.body.customerEmail } : {}),
        // STRATÉGIE: Stocker ownerKey dans metadata pour le webhook
        ownerKey,
        cartId, // Pour les invités
      };

      // Ajouter le userId si l'utilisateur est connecté
      if (req.user?.userId) {
        metadata.userId = req.user.userId;
      }

      // Ajouter le code promo si appliqué
      if (appliedPromoCode) {
        metadata.promoCode = appliedPromoCode;
        metadata.promoDiscount = String(promoDiscount);
      }

      const countryCodeMap: Record<string, string> = {
        FRANCE: 'FR',
        FR: 'FR',
        BELGIQUE: 'BE',
        BELGIUM: 'BE',
        BE: 'BE',
        ALLEMAGNE: 'DE',
        GERMANY: 'DE',
        DE: 'DE',
        ESPAGNE: 'ES',
        SPAIN: 'ES',
        ES: 'ES',
        ITALIE: 'IT',
        ITALY: 'IT',
        IT: 'IT',
        'PAYS-BAS': 'NL',
        NETHERLANDS: 'NL',
        NL: 'NL',
        LUXEMBOURG: 'LU',
        LU: 'LU',
        SUISSE: 'CH',
        SWITZERLAND: 'CH',
        CH: 'CH',
        'ROYAUME-UNI': 'GB',
        UK: 'GB',
        GB: 'GB',
      };

      const rawCountry = (shipping.country || '').trim().toUpperCase();
      const countryCode =
        countryCodeMap[rawCountry] || (rawCountry.length === 2 ? rawCountry : 'FR');

      const allowedCountries = Array.from(
        new Set(
          ['FR', 'BE', 'DE', 'ES', 'IT', 'NL', 'LU', 'CH', 'GB', countryCode].filter(
            (c) => typeof c === 'string' && c.length === 2
          )
        )
      );

      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: req.body.customerEmail,
        success_url: successUrl,
        cancel_url: cancelUrl,
        currency: 'eur',
        metadata,
        payment_intent_data: {
          metadata,
        },
        shipping_address_collection: {
          allowed_countries:
            allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        },
      };

      // Ajouter le coupon si créé
      if (stripeCouponId) {
        sessionConfig.discounts = [{ coupon: stripeCouponId }];
      }

      const session = await stripeClient.checkout.sessions.create(sessionConfig);

      res.status(201).json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la session Stripe:', error);
      console.error('Stack trace:', error.stack);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // Ne pas exposer les détails d'erreur en production
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (error.code === 'STRIPE_NOT_CONFIGURED') {
        return res.status(500).json({
          error: "Stripe n'est pas configuré",
          code: 'STRIPE_NOT_CONFIGURED',
        });
      }

      // Gérer les erreurs de validation d'URL
      if (error.message?.includes('URL')) {
        return res.status(400).json({
          error: error.message,
          code: 'INVALID_REDIRECT_URL',
        });
      }

      // Gérer les erreurs Prisma/PostgreSQL
      if (error.code === 'P2002' || error.code?.startsWith('P')) {
        console.error('Erreur Prisma:', error.code, error.meta);
        return res.status(500).json({
          error: 'Erreur de base de données',
          code: 'DATABASE_ERROR',
          ...(isDevelopment && { details: error.message, prismaCode: error.code }),
        });
      }

      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        ...(isDevelopment && {
          details: error.message,
          stack: error.stack,
          code: error.code,
        }),
      });
    }
  }
);

const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `BLVD-${year}${month}${day}-${random}`;
};

// Route pour vérifier et finaliser une commande après le checkout Stripe
// Cette route est appelée depuis la page de succès pour créer la commande
// (Alternative au webhook pour le développement local)
router.get('/verify-session/:sessionId', optionalAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({
        error: 'Session ID invalide',
        code: 'INVALID_SESSION_ID',
      });
    }

    const stripeClient = ensureStripeConfigured();

    // Récupérer la session Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    // Vérifier si le paiement a réussi
    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        error: "Le paiement n'a pas été complété",
        code: 'PAYMENT_NOT_COMPLETED',
        status: session.payment_status,
      });
    }

    // Vérifier si une commande existe déjà pour cette session
    const existingOrder = await prisma.order.findFirst({
      where: {
        paymentMethod: sessionId, // On utilise paymentMethod pour stocker le sessionId
      },
    });

    if (existingOrder) {
      // La commande existe déjà, retourner ses infos
      return res.json({
        success: true,
        alreadyCreated: true,
        orderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
      });
    }

    // Créer la commande
    const items = parseMetadataItems(session.metadata ?? null);

    if (items.length === 0) {
      return res.status(400).json({
        error: 'Aucun article trouvé dans la session',
        code: 'NO_ITEMS',
      });
    }

    // Récupérer le userId depuis les métadonnées ou depuis l'auth
    const userId =
      session.metadata?.userId && session.metadata.userId.trim() !== ''
        ? session.metadata.userId
        : (req.user?.userId ?? null);

    const order = await prisma.$transaction(async (tx) => {
      return createOrderFromSession(tx, session, items, sessionId, userId);
    });

    console.log(
      `✅ Commande créée: ${order.orderNumber} pour le user ${order.userId || 'anonyme'}`
    );

    // Envoyer l'email de confirmation
    // Priorité : email du formulaire (métadonnées) > email Stripe > email utilisateur connecté
    const customerEmail =
      session.metadata?.customerEmail || session.customer_details?.email || req.user?.email;
    if (customerEmail) {
      // Récupérer la commande complète avec les items pour l'email
      const orderWithItems = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (orderWithItems) {
        // Récupérer le code promo depuis les métadonnées
        const promoCode = session.metadata?.promoCode;
        const promoDiscount = session.metadata?.promoDiscount
          ? parseInt(session.metadata.promoDiscount)
          : 0;

        sendOrderConfirmationEmail(
          {
            orderNumber: orderWithItems.orderNumber,
            totalCents: orderWithItems.totalCents,
            currency: orderWithItems.currency,
            items: orderWithItems.items.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              totalPriceCents: item.totalPriceCents,
            })),
            shippingAddress: orderWithItems.shippingAddress as any,
            billingAddress: orderWithItems.billingAddress as any,
            promoCode: promoCode || undefined,
            promoDiscount: promoDiscount || undefined,
          },
          customerEmail
        ).catch((err) => console.error('Erreur email confirmation:', err));
      }
    }

    res.json({
      success: true,
      alreadyCreated: false,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error('Erreur lors de la vérification de la session:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la commande',
      code: 'ORDER_CREATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

const parseMetadataItems = (metadata: Stripe.Metadata | null | undefined): CheckoutItemInput[] => {
  if (!metadata) return [];

  const raw = metadata['items'];
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        variantId: String(item.variantId),
        quantity: Number(item.quantity),
      }))
      .filter((item) => item.variantId && item.quantity > 0);
  } catch (error) {
    console.error('Impossible de parser le metadata items:', error);
    return [];
  }
};

export const checkoutWebhookHandler = async (req: Request, res: Response) => {
  const stripeClient = ensureStripeConfigured();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook Stripe non configuré: STRIPE_WEBHOOK_SECRET manquant');
    return res.status(500).send('Webhook non configuré');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).send('Signature Stripe manquante');
  }

  let event: Stripe.Event;

  try {
    const rawBody = (req as unknown as { body: Buffer }).body;
    event = stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Signature Stripe invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await processCompletedCheckoutSession(event.data.object as Stripe.Checkout.Session);
    } catch (error: any) {
      console.error('Erreur lors du traitement du webhook Stripe:', error);
      // Ne pas exposer les détails d'erreur
      // Stripe retentera automatiquement en cas d'erreur 5xx
      return res.status(500).json({
        received: false,
        error: 'Erreur lors du traitement du webhook',
      });
    }
  }

  res.status(200).json({ received: true });
};

export default router;
