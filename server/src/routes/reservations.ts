/**
 * Routes API pour la gestion des réservations de panier
 *
 * Les réservations permettent de bloquer temporairement du stock lorsqu'un article
 * est ajouté au panier, empêchant ainsi les ventes multiples d'un même article.
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { optionalAuth } from '../middleware/auth.js';
import { getOwnerKey } from '../utils/cartId.js';
import * as reservationService from '../services/reservationService.js';

const router = Router();

/**
 * POST /api/reservations/reserve
 * Réserve une quantité de stock pour une variante
 *
 * Body:
 * {
 *   "variantId": "string",
 *   "quantity": number,
 *   "ttlMinutes"?: number (optionnel, défaut: 15)
 * }
 *
 * Réponse:
 * {
 *   "reservation": {...},
 *   "availableAfter": number,
 *   "expiresAt": "ISO date"
 * }
 */
router.post(
  '/reserve',
  optionalAuth,
  [
    body('variantId').isString().notEmpty().withMessage('variantId requis'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity doit être un entier >= 1'),
    body('ttlMinutes')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('ttlMinutes doit être entre 1 et 1440'),
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

      const { variantId, quantity, ttlMinutes } = req.body;
      const ownerKey = getOwnerKey(req, res);

      try {
        const reservation = await reservationService.reserve(
          variantId,
          ownerKey,
          quantity,
          ttlMinutes
        );

        // Calculer le stock disponible après réservation
        const availability = await reservationService.getAvailableStock(variantId);

        res.status(201).json({
          reservation: {
            id: reservation.id,
            variantId: reservation.variantId,
            quantity: reservation.quantity,
            expiresAt: reservation.expiresAt,
            createdAt: reservation.createdAt,
          },
          availableAfter: availability.available - reservation.quantity,
          expiresAt: reservation.expiresAt,
        });
      } catch (error: any) {
        if (error.code === 'OUT_OF_STOCK') {
          return res.status(409).json({
            error: 'Stock insuffisant',
            code: 'OUT_OF_STOCK',
            available: error.available || 0,
            requested: error.requested || quantity,
            message: `Stock disponible: ${error.available || 0}, demandé: ${error.requested || quantity}`,
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Erreur lors de la réservation:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/reservations/release
 * Libère une quantité de réservation (ou supprime si quantity non spécifiée)
 *
 * Body:
 * {
 *   "variantId": "string",
 *   "quantity"?: number (optionnel, si non spécifié supprime toute la réservation)
 * }
 */
router.post(
  '/release',
  optionalAuth,
  [
    body('variantId').isString().notEmpty().withMessage('variantId requis'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity doit être un entier >= 1'),
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

      const { variantId, quantity } = req.body;
      const ownerKey = getOwnerKey(req, res);

      await reservationService.release(variantId, ownerKey, quantity);

      res.status(200).json({
        message: 'Réservation libérée',
      });
    } catch (error: any) {
      console.error('Erreur lors de la libération de réservation:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/reservations/release-all
 * Libère toutes les réservations de l'ownerKey actuel
 */
router.post('/release-all', optionalAuth, async (req: Request, res: Response) => {
  try {
    const ownerKey = getOwnerKey(req, res);

    const result = await reservationService.releaseAllForOwner(ownerKey);

    res.status(200).json({
      message: 'Toutes les réservations ont été libérées',
      count: result.count,
    });
  } catch (error: any) {
    console.error('Erreur lors de la libération de toutes les réservations:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /api/reservations/my
 * Récupère toutes les réservations actives de l'ownerKey actuel
 */
router.get('/my', optionalAuth, async (req: Request, res: Response) => {
  try {
    const ownerKey = getOwnerKey(req, res);

    const reservations = await reservationService.getActiveReservationsForOwner(ownerKey);

    res.status(200).json({
      reservations: reservations.map((r) => ({
        id: r.id,
        variantId: r.variantId,
        quantity: r.quantity,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        variant: {
          id: r.variant.id,
          name: r.variant.name,
          priceCents: r.variant.priceCents,
          stock: r.variant.stock,
          product: {
            id: r.variant.product.id,
            name: r.variant.product.name,
            slug: r.variant.product.slug,
            image: r.variant.product.images[0]
              ? {
                  url: r.variant.product.images[0].url,
                  altText: r.variant.product.images[0].altText,
                }
              : null,
          },
        },
      })),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }
});

/**
 * GET /api/reservations/availability/:variantId
 * Récupère le stock disponible pour une variante (stock - réservations actives)
 */
router.get('/availability/:variantId', async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;

    const availability = await reservationService.getAvailableStock(variantId);

    res.status(200).json({
      variantId,
      ...availability,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de la disponibilité:', error);
    if (error.message?.includes('introuvable')) {
      return res.status(404).json({
        error: 'Variante introuvable',
        code: 'VARIANT_NOT_FOUND',
      });
    }
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }
});

export default router;
