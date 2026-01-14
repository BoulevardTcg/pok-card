import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Récupérer les avis d'un produit
router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where: {
          productId,
          isApproved: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.productReview.count({
        where: {
          productId,
          isApproved: true,
        },
      }),
    ]);

    // Calculer la moyenne des notes
    const ratings = await prisma.productReview.aggregate({
      where: {
        productId,
        isApproved: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      stats: {
        averageRating: ratings._avg.rating || 0,
        totalReviews: ratings._count.rating || 0,
      },
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Vérifier si l'utilisateur peut laisser un avis (a acheté le produit)
router.get('/can-review/:productId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Vérifier si l'utilisateur a déjà laissé un avis
    const existingReview = await prisma.productReview.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (existingReview) {
      return res.json({
        canReview: false,
        reason: 'ALREADY_REVIEWED',
        message: 'Vous avez déjà laissé un avis pour ce produit',
      });
    }

    // Vérifier si l'utilisateur a acheté le produit
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        order: {
          userId,
          status: {
            in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'],
          },
        },
        productId,
      },
    });

    if (!hasPurchased) {
      return res.json({
        canReview: false,
        reason: 'NOT_PURCHASED',
        message: 'Vous devez avoir acheté ce produit pour laisser un avis',
      });
    }

    res.json({
      canReview: true,
      reason: null,
      message: null,
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

// Créer un avis
router.post(
  '/',
  authenticateToken,
  [
    body('productId').isString().notEmpty().withMessage("L'ID du produit est obligatoire"),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
    body('title')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Le titre ne peut pas dépasser 100 caractères'),
    body('comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Le commentaire ne peut pas dépasser 1000 caractères'),
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
      const { productId, rating, title, comment } = req.body;

      // Vérifier si l'utilisateur a déjà laissé un avis
      const existingReview = await prisma.productReview.findUnique({
        where: {
          productId_userId: {
            productId,
            userId,
          },
        },
      });

      if (existingReview) {
        return res.status(409).json({
          error: 'Vous avez déjà laissé un avis pour ce produit',
          code: 'REVIEW_ALREADY_EXISTS',
        });
      }

      // Vérifier si l'utilisateur a acheté le produit
      const hasPurchased = await prisma.orderItem.findFirst({
        where: {
          order: {
            userId,
            status: {
              in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'],
            },
          },
          productId,
        },
      });

      // Bloquer si l'utilisateur n'a pas acheté le produit
      if (!hasPurchased) {
        return res.status(403).json({
          error: 'Vous devez avoir acheté ce produit pour laisser un avis',
          code: 'PURCHASE_REQUIRED',
        });
      }

      const review = await prisma.productReview.create({
        data: {
          productId,
          userId,
          rating,
          title: title || null,
          comment: comment || null,
          isVerified: !!hasPurchased,
          isApproved: false, // Nécessite modération
        },
        include: {
          user: {
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
        review,
        message: 'Avis créé avec succès. Il sera publié après modération.',
      });
    } catch {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Mettre à jour un avis
router.put(
  '/:reviewId',
  authenticateToken,
  [
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('La note doit être entre 1 et 5'),
    body('title')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Le titre ne peut pas dépasser 100 caractères'),
    body('comment')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Le commentaire ne peut pas dépasser 1000 caractères'),
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
      const { reviewId } = req.params;
      const { rating, title, comment } = req.body;

      const review = await prisma.productReview.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        return res.status(404).json({
          error: 'Avis non trouvé',
          code: 'REVIEW_NOT_FOUND',
        });
      }

      if (review.userId !== userId) {
        return res.status(403).json({
          error: "Vous n'êtes pas autorisé à modifier cet avis",
          code: 'FORBIDDEN',
        });
      }

      const updatedReview = await prisma.productReview.update({
        where: { id: reviewId },
        data: {
          rating,
          title: title || null,
          comment: comment || null,
          isApproved: false, // Re-modération après modification
        },
        include: {
          user: {
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
        review: updatedReview,
        message: 'Avis mis à jour avec succès',
      });
    } catch {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }
);

// Supprimer un avis
router.delete('/:reviewId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { reviewId } = req.params;

    const review = await prisma.productReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({
        error: 'Avis non trouvé',
        code: 'REVIEW_NOT_FOUND',
      });
    }

    if (review.userId !== userId) {
      return res.status(403).json({
        error: "Vous n'êtes pas autorisé à supprimer cet avis",
        code: 'FORBIDDEN',
      });
    }

    await prisma.productReview.delete({
      where: { id: reviewId },
    });

    res.json({
      message: 'Avis supprimé avec succès',
    });
  } catch {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

export default router;
