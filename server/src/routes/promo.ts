import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { promoLimiter } from '../middleware/security.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';

const router = Router();

// Valider un code promo
router.post(
  '/validate',
  promoLimiter,
  [
    body('code').isString().notEmpty().withMessage('Le code promo est obligatoire'),
    body('totalCents').isInt({ min: 0 }).withMessage('Le montant total est obligatoire'),
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

      const { code, totalCents } = req.body;
      const now = new Date();

      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return res.status(404).json({
          error: 'Code promo invalide',
          code: 'PROMO_NOT_FOUND',
        });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({
          error: "Ce code promo n'est plus actif",
          code: 'PROMO_INACTIVE',
        });
      }

      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        return res.status(400).json({
          error: "Ce code promo n'est pas valide actuellement",
          code: 'PROMO_EXPIRED',
        });
      }

      if (promoCode.minPurchase && totalCents < promoCode.minPurchase) {
        return res.status(400).json({
          error: `Montant minimum d'achat requis: ${(promoCode.minPurchase / 100).toFixed(2)}€`,
          code: 'MIN_PURCHASE_NOT_MET',
        });
      }

      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        return res.status(400).json({
          error: "Ce code promo a atteint sa limite d'utilisation",
          code: 'PROMO_LIMIT_REACHED',
        });
      }

      // Calculer la réduction
      let discountCents = 0;
      if (promoCode.type === 'PERCENTAGE') {
        discountCents = Math.floor((totalCents * promoCode.value) / 100);
        if (promoCode.maxDiscount) {
          discountCents = Math.min(discountCents, promoCode.maxDiscount);
        }
      } else {
        discountCents = promoCode.value;
      }

      res.json({
        valid: true,
        code: promoCode.code,
        type: promoCode.type,
        discountCents,
        finalAmountCents: totalCents - discountCents,
      });
    } catch (error) {
      logger.error('Erreur promo:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Appliquer un code promo (incrémente le compteur)
router.post(
  '/apply',
  promoLimiter,
  [body('code').isString().notEmpty().withMessage('Le code promo est obligatoire')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array(),
        });
      }

      const { code } = req.body;
      const now = new Date();

      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return res.status(404).json({
          error: 'Code promo invalide',
          code: 'PROMO_NOT_FOUND',
        });
      }

      // Q5: vérifier isActive (manquait avant)
      if (!promoCode.isActive) {
        return res.status(400).json({
          error: "Ce code promo n'est plus actif",
          code: 'PROMO_INACTIVE',
        });
      }

      // Vérifier la validité temporelle
      if (now < promoCode.validFrom || now > promoCode.validUntil) {
        return res.status(400).json({
          error: "Ce code promo n'est pas valide actuellement",
          code: 'PROMO_EXPIRED',
        });
      }

      // Fast-path : vérification préliminaire (protégée par l'incrément atomique ci-dessous)
      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        return res.status(400).json({
          error: "Ce code promo a atteint sa limite d'utilisation",
          code: 'PROMO_LIMIT_REACHED',
        });
      }

      // S1: Incrément atomique — vérifie ET incrémente en une seule opération (protection TOCTOU)
      const atomicUpdate = await prisma.promoCode.updateMany({
        where: {
          code: promoCode.code,
          isActive: true,
          ...(promoCode.usageLimit !== null && promoCode.usageLimit !== undefined
            ? { usedCount: { lt: promoCode.usageLimit } }
            : {}),
        },
        data: { usedCount: { increment: 1 } },
      });

      if (atomicUpdate.count === 0) {
        return res.status(400).json({
          error: "Ce code promo a atteint sa limite d'utilisation",
          code: 'PROMO_LIMIT_REACHED',
        });
      }

      res.json({
        message: 'Code promo appliqué avec succès',
      });
    } catch (error) {
      logger.error('Erreur promo:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

export default router;
