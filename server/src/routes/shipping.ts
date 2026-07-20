import { Router, type Request, type Response } from 'express';
import { query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { getBoxtalConfig } from '../config/boxtal.js';
import { getEnabledShippingMethods } from '../config/shipping.js';
import { BoxtalApiError, searchParcelPoints } from '../services/boxtal.js';
import { applyBoxtalTrackingUpdate } from '../services/fulfillment.js';

const router = Router();

/**
 * Rate limiter dédié à la recherche de points relais (appel API Boxtal externe)
 */
const parcelPointLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: 'Trop de recherches de points relais, veuillez réessayer plus tard',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Liste des modes de livraison actifs (source de vérité côté serveur)
router.get('/methods', (_req: Request, res: Response) => {
  res.json({ data: getEnabledShippingMethods() });
});

// Recherche de points relais proches d'une adresse (proxy Boxtal — les clés
// API ne sont jamais exposées au frontend)
router.get(
  '/parcel-points',
  parcelPointLimiter,
  [
    query('postalCode')
      .isString()
      .trim()
      .matches(/^[A-Za-z0-9 -]{2,12}$/)
      .withMessage('Code postal invalide'),
    query('city').optional().isString().trim().isLength({ max: 100 }).withMessage('Ville invalide'),
    query('country')
      .optional()
      .isString()
      .trim()
      .matches(/^[A-Za-z]{2}$/)
      .withMessage('Pays invalide (code ISO 2 lettres)'),
    query('street')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 250 })
      .withMessage('Adresse invalide'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paramètres invalides',
          details: errors.array(),
        },
      });
    }

    try {
      const points = await searchParcelPoints({
        postalCode: String(req.query.postalCode),
        city: req.query.city ? String(req.query.city) : undefined,
        countryIsoCode: req.query.country ? String(req.query.country) : 'FR',
        street: req.query.street ? String(req.query.street) : undefined,
      });

      res.json({ data: points });
    } catch (err) {
      if (err instanceof BoxtalApiError) {
        logger.warn('Recherche de points relais échouée', {
          status: err.status,
          code: err.code,
          detail: err.detail,
        });
        const status = err.status === 503 ? 503 : 502;
        return res.status(status).json({
          error: {
            code: err.code,
            message:
              err.code === 'BOXTAL_NOT_CONFIGURED'
                ? 'La recherche de points relais est indisponible'
                : 'La recherche de points relais a échoué, veuillez réessayer',
          },
        });
      }
      logger.error('Erreur inattendue lors de la recherche de points relais', {
        err: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erreur interne du serveur' },
      });
    }
  }
);

// ============================================================================
// WEBHOOK BOXTAL
// ============================================================================

const timingSafeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
};

/**
 * Vérifie l'en-tête x-bxt-signature : HMAC SHA256 du corps JSON brut, encodé
 * avec la clé de validation fournie lors de la souscription au webhook.
 * Les encodages hex et base64 sont acceptés (non précisé par la doc Boxtal).
 */
export function verifyBoxtalSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== 'string') return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody);
  const digest = hmac.digest();
  return (
    timingSafeCompare(signature, digest.toString('hex')) ||
    timingSafeCompare(signature, digest.toString('base64'))
  );
}

type BoxtalWebhookEvent = {
  id?: string;
  type?: string;
  shippingOrderId?: string;
  shipmentExternalId?: string;
  payload?: {
    trackings?: Array<{
      status?: string;
      trackingNumber?: string;
      packageTrackingUrl?: string;
    }>;
    documents?: Array<{ url?: string; type?: string }>;
  };
};

async function findOrderForEvent(event: BoxtalWebhookEvent) {
  const include = {
    items: true,
    user: { select: { email: true } },
  } as const;

  if (event.shippingOrderId) {
    const order = await prisma.order.findUnique({
      where: { boxtalShippingOrderId: event.shippingOrderId },
      include,
    });
    if (order) return order;
  }
  if (event.shipmentExternalId) {
    // externalId envoyé à Boxtal = id interne de la commande
    return prisma.order.findUnique({ where: { id: event.shipmentExternalId }, include });
  }
  return null;
}

type OrderForWebhook = NonNullable<Awaited<ReturnType<typeof findOrderForEvent>>>;

async function handleTrackingChanged(order: OrderForWebhook, event: BoxtalWebhookEvent) {
  const tracking = (event.payload?.trackings || []).find(
    (t) => t && (t.trackingNumber || t.status)
  );
  if (!tracking) return;

  // Transitions d'état + emails (expédiée / livrée) gérés par le service partagé
  await applyBoxtalTrackingUpdate(order, {
    status: tracking.status,
    trackingNumber: tracking.trackingNumber,
    trackingUrl: tracking.packageTrackingUrl,
  });
}

async function handleDocumentCreated(order: OrderForWebhook, event: BoxtalWebhookEvent) {
  const documents = event.payload?.documents || [];
  const label =
    documents.find((doc) => doc && doc.type === 'LABEL' && doc.url) ||
    documents.find((doc) => doc && doc.url);
  if (!label?.url || label.url === order.labelUrl) return;

  await prisma.order.update({
    where: { id: order.id },
    data: { labelUrl: label.url },
  });
}

/**
 * Handler du webhook Boxtal — monté dans index.ts avec express.raw (le corps
 * brut est nécessaire pour vérifier la signature HMAC). Doit répondre en
 * moins de 2 secondes, sinon Boxtal rejoue l'événement.
 */
export const boxtalWebhookHandler = async (req: Request, res: Response) => {
  const config = getBoxtalConfig();
  if (!config?.webhookSecret) {
    return res.status(503).json({ error: 'Webhook Boxtal non configuré' });
  }

  const rawBody = (req as unknown as { body: Buffer }).body;
  const signature = req.headers['x-bxt-signature'];

  if (
    typeof signature !== 'string' ||
    !verifyBoxtalSignature(rawBody, signature, config.webhookSecret)
  ) {
    logger.warn('Webhook Boxtal : signature invalide');
    return res.status(401).json({ error: 'Signature invalide' });
  }

  let event: BoxtalWebhookEvent;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Corps JSON invalide' });
  }

  try {
    const order = await findOrderForEvent(event);
    if (!order) {
      // 200 pour éviter les rejeux : l'événement ne concerne aucune commande connue
      logger.warn('Webhook Boxtal : commande introuvable', {
        type: event.type,
        shippingOrderId: event.shippingOrderId,
        shipmentExternalId: event.shipmentExternalId,
      });
      return res.status(200).json({ received: true });
    }

    if (event.type === 'TRACKING_CHANGED') {
      await handleTrackingChanged(order, event);
    } else if (event.type === 'DOCUMENT_CREATED') {
      await handleDocumentCreated(order, event);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook Boxtal : erreur de traitement', {
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Erreur de traitement' });
  }
};

export default router;
