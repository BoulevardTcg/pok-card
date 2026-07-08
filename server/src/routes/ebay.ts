import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

const router = Router();

const EBAY_VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN || '';
const EBAY_NOTIFICATION_ENDPOINT_URL = process.env.EBAY_NOTIFICATION_ENDPOINT_URL || '';

// Endpoint public non authentifié (appelé par eBay) : on limite le débit par IP.
const ebayNotificationsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * eBay appelle ce GET (avec ?challenge_code=...) pour valider l'endpoint avant
 * d'activer les notifications. La réponse attendue est le hash SHA-256 (hex)
 * de challengeCode + verificationToken + endpointURL, dans { challengeResponse }.
 * Doc: https://developer.ebay.com/api-docs/commerce/notification/overview.html
 */
router.get('/', (req: Request, res: Response) => {
  const challengeCode =
    typeof req.query.challenge_code === 'string' ? req.query.challenge_code : undefined;

  logger.info('eBay notifications - challenge GET reçu', {
    challengeCode,
    ip: req.ip,
  });

  if (!challengeCode) {
    return res.status(400).json({ error: 'Paramètre challenge_code manquant' });
  }

  if (!EBAY_VERIFICATION_TOKEN || !EBAY_NOTIFICATION_ENDPOINT_URL) {
    logger.error(
      'eBay notifications - EBAY_VERIFICATION_TOKEN ou EBAY_NOTIFICATION_ENDPOINT_URL manquant en configuration'
    );
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  const challengeResponse = crypto
    .createHash('sha256')
    .update(challengeCode)
    .update(EBAY_VERIFICATION_TOKEN)
    .update(EBAY_NOTIFICATION_ENDPOINT_URL)
    .digest('hex');

  logger.debug('eBay notifications - challengeResponse calculé', { challengeResponse });

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ challengeResponse });
});

/**
 * Notifications réelles envoyées par eBay en POST (ex: MARKETPLACE_ACCOUNT_DELETION).
 * eBay attend un 200 rapide ; on logge puis on répond immédiatement.
 */
router.post('/', ebayNotificationsLimiter, (req: Request, res: Response) => {
  logger.info('eBay notifications - notification POST reçue', {
    topic: req.body?.metadata?.topic,
    notificationId: req.body?.notification?.notificationId,
    eventDate: req.body?.notification?.eventDate,
    hasSignature: Boolean(req.get('x-ebay-signature')),
    body: req.body,
  });

  // Note: eBay signe chaque notification via l'en-tête `x-ebay-signature`.
  // Une vérification cryptographique complète (récupération de la clé publique via
  // la Notification API puis vérification ECDSA) peut être ajoutée ici si nécessaire ;
  // elle n'est pas requise pour que l'endpoint soit validé par eBay.

  return res.status(200).json({ status: 'success' });
});

export default router;
