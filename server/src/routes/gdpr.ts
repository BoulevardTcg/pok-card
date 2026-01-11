/**
 * Routes RGPD (Règlement Général sur la Protection des Données)
 *
 * Implémente les droits des utilisateurs :
 * - Art. 15 : Droit d'accès
 * - Art. 17 : Droit à l'effacement ("droit à l'oubli")
 * - Art. 20 : Droit à la portabilité des données
 * - Art. 7 : Gestion du consentement
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { verifyPassword, revokeAllUserTokens } from '../utils/auth.js';
import { auditLog } from '../utils/audit.js';

const router = Router();

// Toutes les routes RGPD nécessitent une authentification
router.use(authenticateToken);

// ============================================================================
// DROIT À LA PORTABILITÉ (Art. 20) - Export des données
// ============================================================================

/**
 * GET /api/gdpr/export
 * Exporte toutes les données personnelles de l'utilisateur au format JSON
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Récupérer toutes les données de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bio: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        marketingConsent: true,
        marketingConsentAt: true,
        analyticsConsent: true,
        analyticsConsentAt: true,
        privacyPolicyVersion: true,
        privacyAcceptedAt: true,
        // Ne PAS inclure : password, twoFactorSecret, isAdmin
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    // Récupérer le profil étendu
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        birthDate: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Récupérer les commandes (données anonymisées pour les commandes liées)
    const orders = await prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalCents: true,
        currency: true,
        shippingMethod: true,
        shippingAddress: true,
        billingAddress: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            variantName: true,
            quantity: true,
            unitPriceCents: true,
            totalPriceCents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les favoris
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: {
        cardId: true,
        cardName: true,
        cardSet: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les avis
    const reviews = await prisma.productReview.findMany({
      where: { userId },
      select: {
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer la collection
    const collection = await prisma.userCollection.findMany({
      where: { userId },
      select: {
        cardId: true,
        cardName: true,
        cardSet: true,
        quantity: true,
        condition: true,
        language: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les offres d'échange (créées)
    const tradeOffersCreated = await prisma.tradeOffer.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        status: true,
        creatorCards: true,
        receiverCards: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Récupérer les offres d'échange (reçues)
    const tradeOffersReceived = await prisma.tradeOffer.findMany({
      where: { receiverId: userId },
      select: {
        id: true,
        status: true,
        creatorCards: true,
        receiverCards: true,
        message: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Construire l'objet d'export
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user,
      profile,
      orders,
      favorites,
      reviews,
      collection,
      tradeOffers: {
        created: tradeOffersCreated,
        received: tradeOffersReceived,
      },
    };

    // Log audit
    auditLog(req, 'USER_UPDATE', 'user', userId, { action: 'GDPR_EXPORT' });

    // Envoyer le fichier JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mes-donnees-${user.username}-${new Date().toISOString().split('T')[0]}.json"`
    );

    res.json(exportData);
  } catch (error) {
    console.error("Erreur lors de l'export des données:", error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// ============================================================================
// DROIT À L'EFFACEMENT (Art. 17) - Suppression du compte
// ============================================================================

/**
 * POST /api/gdpr/delete-request
 * Demande de suppression du compte (avec délai de 30 jours)
 */
router.post(
  '/delete-request',
  [body('password').notEmpty().withMessage('Mot de passe requis pour confirmer')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Données invalides',
          details: errors.array(),
        });
      }

      const userId = req.user!.userId;
      const { password } = req.body;

      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND',
        });
      }

      // Vérifier le mot de passe
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          error: 'Mot de passe incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      // Programmer la suppression dans 30 jours
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      await prisma.user.update({
        where: { id: userId },
        data: {
          deletionRequestedAt: new Date(),
          deletionScheduledAt: deletionDate,
        },
      });

      // Log audit
      auditLog(req, 'USER_UPDATE', 'user', userId, {
        action: 'GDPR_DELETE_REQUEST',
        scheduledAt: deletionDate.toISOString(),
      });

      res.json({
        message: 'Demande de suppression enregistrée',
        scheduledDeletionDate: deletionDate.toISOString(),
        info: 'Votre compte sera supprimé dans 30 jours. Vous pouvez annuler cette demande en vous reconnectant.',
      });
    } catch (error) {
      console.error('Erreur lors de la demande de suppression:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

/**
 * POST /api/gdpr/cancel-delete
 * Annule une demande de suppression en cours
 */
router.post('/cancel-delete', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.deletionRequestedAt) {
      return res.status(400).json({
        error: 'Aucune demande de suppression en cours',
        code: 'NO_DELETE_REQUEST',
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      },
    });

    // Log audit
    auditLog(req, 'USER_UPDATE', 'user', userId, { action: 'GDPR_DELETE_CANCELLED' });

    res.json({
      message: 'Demande de suppression annulée',
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la suppression:", error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

/**
 * DELETE /api/gdpr/delete-now
 * Suppression immédiate du compte (avec confirmation par mot de passe)
 */
router.delete(
  '/delete-now',
  [
    body('password').notEmpty().withMessage('Mot de passe requis'),
    body('confirmation')
      .equals('SUPPRIMER MON COMPTE')
      .withMessage('Veuillez taper "SUPPRIMER MON COMPTE" pour confirmer'),
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

      const userId = req.user!.userId;
      const { password } = req.body;

      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND',
        });
      }

      // Empêcher la suppression d'un admin
      if (user.isAdmin) {
        return res.status(403).json({
          error: 'Les comptes administrateurs ne peuvent pas être supprimés via cette route',
          code: 'ADMIN_CANNOT_DELETE',
        });
      }

      // Vérifier le mot de passe
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          error: 'Mot de passe incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      // Log audit AVANT suppression
      auditLog(req, 'USER_UPDATE', 'user', userId, {
        action: 'GDPR_DELETE_IMMEDIATE',
        email: user.email,
        username: user.username,
      });

      // Révoquer tous les tokens
      await revokeAllUserTokens(userId);

      // Supprimer l'utilisateur (les relations avec onDelete: Cascade seront supprimées)
      // Les commandes seront conservées avec userId = null (onDelete: SetNull)
      await prisma.user.delete({
        where: { id: userId },
      });

      res.json({
        message: 'Votre compte a été supprimé définitivement',
        info: 'Toutes vos données personnelles ont été effacées. Vos commandes sont conservées de manière anonyme pour des raisons légales.',
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// ============================================================================
// GESTION DU CONSENTEMENT (Art. 7)
// ============================================================================

/**
 * GET /api/gdpr/consent
 * Récupère l'état actuel des consentements
 */
router.get('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        marketingConsent: true,
        marketingConsentAt: true,
        analyticsConsent: true,
        analyticsConsentAt: true,
        privacyPolicyVersion: true,
        privacyAcceptedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      consent: {
        marketing: {
          accepted: user.marketingConsent,
          acceptedAt: user.marketingConsentAt,
        },
        analytics: {
          accepted: user.analyticsConsent,
          acceptedAt: user.analyticsConsentAt,
        },
        privacyPolicy: {
          version: user.privacyPolicyVersion,
          acceptedAt: user.privacyAcceptedAt,
        },
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des consentements:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

/**
 * PUT /api/gdpr/consent
 * Met à jour les consentements
 */
router.put(
  '/consent',
  [
    body('marketing').optional().isBoolean().withMessage('marketing doit être un booléen'),
    body('analytics').optional().isBoolean().withMessage('analytics doit être un booléen'),
    body('privacyPolicyVersion').optional().isString(),
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

      const userId = req.user!.userId;
      const { marketing, analytics, privacyPolicyVersion } = req.body;

      const updateData: any = {};
      const now = new Date();

      if (typeof marketing === 'boolean') {
        updateData.marketingConsent = marketing;
        updateData.marketingConsentAt = marketing ? now : null;
      }

      if (typeof analytics === 'boolean') {
        updateData.analyticsConsent = analytics;
        updateData.analyticsConsentAt = analytics ? now : null;
      }

      if (privacyPolicyVersion) {
        updateData.privacyPolicyVersion = privacyPolicyVersion;
        updateData.privacyAcceptedAt = now;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'Aucune donnée à mettre à jour',
          code: 'NO_DATA',
        });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          marketingConsent: true,
          marketingConsentAt: true,
          analyticsConsent: true,
          analyticsConsentAt: true,
          privacyPolicyVersion: true,
          privacyAcceptedAt: true,
        },
      });

      // Log audit
      auditLog(req, 'USER_UPDATE', 'user', userId, {
        action: 'GDPR_CONSENT_UPDATE',
        changes: updateData,
      });

      res.json({
        message: 'Consentements mis à jour',
        consent: {
          marketing: {
            accepted: user.marketingConsent,
            acceptedAt: user.marketingConsentAt,
          },
          analytics: {
            accepted: user.analyticsConsent,
            acceptedAt: user.analyticsConsentAt,
          },
          privacyPolicy: {
            version: user.privacyPolicyVersion,
            acceptedAt: user.privacyAcceptedAt,
          },
        },
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des consentements:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// ============================================================================
// STATUT DE SUPPRESSION
// ============================================================================

/**
 * GET /api/gdpr/deletion-status
 * Vérifie si une demande de suppression est en cours
 */
router.get('/deletion-status', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionRequestedAt: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      deletionPending: !!user.deletionRequestedAt,
      requestedAt: user.deletionRequestedAt,
      scheduledAt: user.deletionScheduledAt,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut de suppression:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

export default router;
