import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Récupérer la collection de l'utilisateur
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [collection, total] = await Promise.all([
      prisma.userCollection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.userCollection.count({
        where: { userId }
      })
    ]);

    // Statistiques de la collection
    const stats = await prisma.userCollection.aggregate({
      where: { userId },
      _sum: {
        quantity: true
      },
      _count: {
        id: true
      }
    });

    res.json({
      collection,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      stats: {
        totalCards: stats._sum.quantity || 0,
        uniqueCards: stats._count.id || 0
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la collection:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Ajouter une carte à la collection
router.post('/', authenticateToken, [
  body('cardId')
    .isString()
    .notEmpty()
    .withMessage('L\'ID de la carte est obligatoire'),
  body('cardName')
    .isString()
    .notEmpty()
    .withMessage('Le nom de la carte est obligatoire'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La quantité doit être supérieure à 0'),
  body('condition')
    .optional()
    .isString()
    .withMessage('L\'état doit être une chaîne'),
  body('language')
    .optional()
    .isString()
    .withMessage('La langue doit être une chaîne')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const userId = req.user!.userId;
    const { cardId, cardName, cardImage, cardSet, quantity = 1, condition, language, notes } = req.body;

    // Vérifier si la carte existe déjà dans la collection
    const existing = await prisma.userCollection.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId
        }
      }
    });

    let collectionItem;
    if (existing) {
      // Mettre à jour la quantité
      collectionItem = await prisma.userCollection.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          condition: condition || existing.condition,
          language: language || existing.language,
          notes: notes || existing.notes
        }
      });
    } else {
      // Créer une nouvelle entrée
      collectionItem = await prisma.userCollection.create({
        data: {
          userId,
          cardId,
          cardName,
          cardImage: cardImage || null,
          cardSet: cardSet || null,
          quantity,
          condition: condition || null,
          language: language || null,
          notes: notes || null
        }
      });
    }

    res.status(201).json({
      message: 'Carte ajoutée à la collection',
      item: collectionItem
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout à la collection:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Mettre à jour une carte de la collection
router.put('/:id', authenticateToken, [
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La quantité doit être supérieure à 0'),
  body('condition')
    .optional()
    .isString(),
  body('language')
    .optional()
    .isString(),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const userId = req.user!.userId;
    const { id } = req.params;
    const { quantity, condition, language, notes } = req.body;

    const item = await prisma.userCollection.findUnique({
      where: { id }
    });

    if (!item) {
      return res.status(404).json({
        error: 'Carte non trouvée dans la collection',
        code: 'ITEM_NOT_FOUND'
      });
    }

    if (item.userId !== userId) {
      return res.status(403).json({
        error: 'Vous n\'êtes pas autorisé à modifier cette carte',
        code: 'FORBIDDEN'
      });
    }

    const updated = await prisma.userCollection.update({
      where: { id },
      data: {
        quantity,
        condition,
        language,
        notes
      }
    });

    res.json({
      message: 'Carte mise à jour',
      item: updated
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la collection:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Supprimer une carte de la collection
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const item = await prisma.userCollection.findUnique({
      where: { id }
    });

    if (!item) {
      return res.status(404).json({
        error: 'Carte non trouvée dans la collection',
        code: 'ITEM_NOT_FOUND'
      });
    }

    if (item.userId !== userId) {
      return res.status(403).json({
        error: 'Vous n\'êtes pas autorisé à supprimer cette carte',
        code: 'FORBIDDEN'
      });
    }

    await prisma.userCollection.delete({
      where: { id }
    });

    res.json({
      message: 'Carte supprimée de la collection'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la collection:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;


