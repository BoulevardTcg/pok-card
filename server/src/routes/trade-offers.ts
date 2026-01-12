import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, TradeStatus } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Créer une offre d'échange
router.post(
  '/',
  authenticateToken,
  [
    body('receiverId').isString().notEmpty().withMessage("L'ID du destinataire est obligatoire"),
    body('creatorCards').isArray({ min: 1 }).withMessage('Vous devez proposer au moins une carte'),
    body('receiverCards').isArray({ min: 1 }).withMessage('Vous devez demander au moins une carte'),
    body('message')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Le message ne peut pas dépasser 500 caractères'),
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

      const creatorId = req.user!.userId;
      const { receiverId, creatorCards, receiverCards, message } = req.body;

      if (creatorId === receiverId) {
        return res.status(400).json({
          error: "Vous ne pouvez pas créer une offre d'échange avec vous-même",
          code: 'INVALID_RECEIVER',
        });
      }

      // Vérifier que le destinataire existe
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return res.status(404).json({
          error: 'Destinataire non trouvé',
          code: 'RECEIVER_NOT_FOUND',
        });
      }

      const offer = await prisma.tradeOffer.create({
        data: {
          creatorId,
          receiverId,
          creatorCards,
          receiverCards,
          message: message || null,
          status: TradeStatus.PENDING,
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              firstName: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              firstName: true,
              avatar: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Offre d'échange créée avec succès",
        offer,
      });
    } catch {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Récupérer les offres d'échange (envoyées et reçues)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { type = 'all' } = req.query; // 'sent', 'received', 'all'

    const where: any = {};

    if (type === 'sent') {
      where.creatorId = userId;
    } else if (type === 'received') {
      where.receiverId = userId;
    } else {
      where.OR = [{ creatorId: userId }, { receiverId: userId }];
    }

    const offers = await prisma.tradeOffer.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ offers });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Récupérer une offre spécifique
router.get('/:offerId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { offerId } = req.params;

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
      },
    });

    if (!offer) {
      return res.status(404).json({
        error: 'Offre non trouvée',
        code: 'OFFER_NOT_FOUND',
      });
    }

    if (offer.creatorId !== userId && offer.receiverId !== userId) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à voir cette offre",
        code: 'FORBIDDEN',
      });
    }

    res.json({ offer });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Accepter une offre
router.post('/:offerId/accept', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { offerId } = req.params;

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return res.status(404).json({
        error: 'Offre non trouvée',
        code: 'OFFER_NOT_FOUND',
      });
    }

    if (offer.receiverId !== userId) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à accepter cette offre",
        code: 'FORBIDDEN',
      });
    }

    if (offer.status !== TradeStatus.PENDING) {
      return res.status(400).json({
        error: 'Cette offre ne peut plus être acceptée',
        code: 'OFFER_NOT_PENDING',
      });
    }

    const updated = await prisma.tradeOffer.update({
      where: { id: offerId },
      data: {
        status: TradeStatus.ACCEPTED,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      message: 'Offre acceptée avec succès',
      offer: updated,
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Refuser une offre
router.post('/:offerId/reject', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { offerId } = req.params;

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return res.status(404).json({
        error: 'Offre non trouvée',
        code: 'OFFER_NOT_FOUND',
      });
    }

    if (offer.receiverId !== userId) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à refuser cette offre",
        code: 'FORBIDDEN',
      });
    }

    if (offer.status !== TradeStatus.PENDING) {
      return res.status(400).json({
        error: 'Cette offre ne peut plus être refusée',
        code: 'OFFER_NOT_PENDING',
      });
    }

    const updated = await prisma.tradeOffer.update({
      where: { id: offerId },
      data: {
        status: TradeStatus.REJECTED,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      message: 'Offre refusée',
      offer: updated,
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Annuler une offre
router.post('/:offerId/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { offerId } = req.params;

    const offer = await prisma.tradeOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return res.status(404).json({
        error: 'Offre non trouvée',
        code: 'OFFER_NOT_FOUND',
      });
    }

    if (offer.creatorId !== userId) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à annuler cette offre",
        code: 'FORBIDDEN',
      });
    }

    if (offer.status !== TradeStatus.PENDING) {
      return res.status(400).json({
        error: 'Cette offre ne peut plus être annulée',
        code: 'OFFER_NOT_PENDING',
      });
    }

    const updated = await prisma.tradeOffer.update({
      where: { id: offerId },
      data: {
        status: TradeStatus.CANCELLED,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            avatar: true,
          },
        },
      },
    });

    res.json({
      message: 'Offre annulée',
      offer: updated,
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

export default router;
