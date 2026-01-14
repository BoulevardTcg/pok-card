import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { sendContactEmail, sendContactAutoReply } from '../services/email.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const CONTACT_AUTOREPLY_ENABLED =
  (process.env.CONTACT_AUTOREPLY_ENABLED ?? 'true').toLowerCase() === 'true';

const isBlockedAutoReplyRecipient = (email: string) => {
  const domain = (email.split('@')[1] || '').toLowerCase();
  return ['example.com', 'example.org', 'example.net', 'invalid'].includes(domain);
};

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de messages envoyés. Réessayez dans quelques minutes.',
    code: 'RATE_LIMITED',
    retryAfter: 10 * 60,
  },
});

const contactValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Nom requis')
    .isLength({ min: 2, max: 80 })
    .withMessage('Le nom doit contenir entre 2 et 80 caractères'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email requis')
    .isEmail()
    .withMessage('Email invalide')
    .isLength({ max: 254 })
    .withMessage('Email trop long')
    .normalizeEmail(),
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Sujet requis')
    .isLength({ min: 2, max: 120 })
    .withMessage('Le sujet doit contenir entre 2 et 120 caractères'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message requis')
    .isLength({ min: 10, max: 4000 })
    .withMessage('Le message doit contenir entre 10 et 4000 caractères'),
  // Honeypot: certains navigateurs auto-remplissent "website", on supporte aussi "companyWebsite".
  body('website').optional().isLength({ max: 0 }).withMessage('Spam détecté'),
  body('companyWebsite').optional().isLength({ max: 0 }).withMessage('Spam détecté'),
];

router.post(
  '/',
  authenticateToken,
  contactLimiter,
  contactValidation,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const hasHoneypot = errors
        .array()
        .some(
          (e) =>
            e.type === 'field' && (['website', 'companyWebsite'] as const).includes((e as any).path)
        );
      if (hasHoneypot) {
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({
        ok: false,
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
      });
    }

    const { name, email, subject, message } = req.body as {
      name: string;
      email: string;
      subject: string;
      message: string;
    };

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || undefined;
    const createdAt = new Date();

    try {
      const sent = await sendContactEmail({
        name,
        email,
        subject,
        message,
        ip,
        userAgent,
        createdAt,
      });
      if (!sent) {
        return res
          .status(500)
          .json({ ok: false, error: 'Erreur lors de l’envoi du message', code: 'SEND_FAILED' });
      }

      if (CONTACT_AUTOREPLY_ENABLED && !isBlockedAutoReplyRecipient(email)) {
        await sendContactAutoReply({ name, email, subject });
      }

      return res.status(200).json({ ok: true });
    } catch {
      return res
        .status(500)
        .json({ ok: false, error: 'Erreur interne du serveur', code: 'INTERNAL_SERVER_ERROR' });
    }
  }
);

export default router;
