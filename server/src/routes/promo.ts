import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Valider un code promo
router.post(
  '/validate',
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
      console.error('Erreur lors de la validation du code promo:', error);
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

      const promoCode = await prisma.promoCode.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!promoCode) {
        return res.status(404).json({
          error: 'Code promo invalide',
          code: 'PROMO_NOT_FOUND',
        });
      }

      // Incrémenter le compteur d'utilisation
      await prisma.promoCode.update({
        where: { code: promoCode.code },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });

      res.json({
        message: 'Code promo appliqué avec succès',
      });
    } catch (error) {
      console.error("Erreur lors de l'application du code promo:", error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

export default router;
