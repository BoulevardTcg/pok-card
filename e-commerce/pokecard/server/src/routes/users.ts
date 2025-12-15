import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { authenticateToken, requireOwnerOrAdmin } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Récupérer le profil de l'utilisateur connecté
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        _count: {
          select: {
            favorites: true,
            orders: true,
            tradeOffers: true,
            tradeOffersReceived: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isAdmin: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        _count: true
      }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      })
    }

    res.json({
      user
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Mettre à jour le profil de l'utilisateur connecté
router.put('/profile', authenticateToken, [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le prénom doit contenir entre 1 et 50 caractères'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La bio ne peut pas dépasser 500 caractères')
], async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const userId = req.user!.userId
    const { firstName, lastName, bio } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        bio
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        isAdmin: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      message: 'Profil mis à jour avec succès',
      user: updatedUser
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Mettre à jour le profil étendu de l'utilisateur
router.put('/profile/extended', authenticateToken, [
  body('phone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Numéro de téléphone invalide'),
  body('address')
    .optional()
    .isLength({ max: 200 })
    .withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
  body('city')
    .optional()
    .isLength({ max: 100 })
    .withMessage('La ville ne peut pas dépasser 100 caractères'),
  body('postalCode')
    .optional()
    .matches(/^[0-9A-Z\s\-]+$/i)
    .withMessage('Code postal invalide'),
  body('country')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Le pays ne peut pas dépasser 100 caractères'),
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Date de naissance invalide')
], async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const userId = req.user!.userId
    const { phone, address, city, postalCode, country, birthDate } = req.body

    // Vérifier si le profil existe déjà
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    let updatedProfile
    if (existingProfile) {
      updatedProfile = await prisma.userProfile.update({
        where: { userId },
        data: {
          phone,
          address,
          city,
          postalCode,
          country,
          birthDate: birthDate ? new Date(birthDate) : undefined
        }
      })
    } else {
      updatedProfile = await prisma.userProfile.create({
        data: {
          userId,
          phone,
          address,
          city,
          postalCode,
          country,
          birthDate: birthDate ? new Date(birthDate) : undefined
        }
      })
    }

    res.json({
      message: 'Profil étendu mis à jour avec succès',
      profile: updatedProfile
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil étendu:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Changer le mot de passe
router.put('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mot de passe actuel requis'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre')
], async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const userId = req.user!.userId
    const { currentPassword, newPassword } = req.body

    // Récupérer l'utilisateur avec son mot de passe hashé
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      })
    }

    // Vérifier le mot de passe actuel
    const { verifyPassword } = await import('../utils/auth.js')
    const isValidPassword = await verifyPassword(currentPassword, user.password)
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      })
    }

    // Hasher le nouveau mot de passe
    const { hashPassword } = await import('../utils/auth.js')
    const hashedNewPassword = await hashPassword(newPassword)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })

    // Révoquer tous les tokens de rafraîchissement
    const { revokeAllUserTokens } = await import('../utils/auth.js')
    await revokeAllUserTokens(userId)

    res.json({
      message: 'Mot de passe changé avec succès. Vous devrez vous reconnecter sur tous vos appareils.'
    })
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Récupérer les favoris de l'utilisateur
router.get('/favorites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { page = 1, limit = 20 } = req.query

    const skip = (Number(page) - 1) * Number(limit)

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.favorite.count({
        where: { userId }
      })
    ])

    res.json({
      favorites,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Ajouter une carte aux favoris
router.post('/favorites', authenticateToken, [
  body('cardId')
    .notEmpty()
    .withMessage('ID de la carte requis'),
  body('cardName')
    .notEmpty()
    .withMessage('Nom de la carte requis'),
  body('cardImage')
    .notEmpty()
    .withMessage('Image de la carte requise'),
  body('cardSet')
    .notEmpty()
    .withMessage('Série de la carte requise')
], async (req: Request, res: Response) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      })
    }

    const userId = req.user!.userId
    const { cardId, cardName, cardImage, cardSet } = req.body

    // Vérifier si la carte est déjà dans les favoris
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId
        }
      }
    })

    if (existingFavorite) {
      return res.status(409).json({
        error: 'Cette carte est déjà dans vos favoris',
        code: 'CARD_ALREADY_FAVORITE'
      })
    }

    // Ajouter aux favoris
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        cardId,
        cardName,
        cardImage,
        cardSet
      }
    })

    res.status(201).json({
      message: 'Carte ajoutée aux favoris',
      favorite
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Supprimer une carte des favoris
router.delete('/favorites/:cardId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { cardId } = req.params

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId
        }
      }
    })

    if (!favorite) {
      return res.status(404).json({
        error: 'Favori non trouvé',
        code: 'FAVORITE_NOT_FOUND'
      })
    }

    await prisma.favorite.delete({
      where: {
        userId_cardId: {
          userId,
          cardId
        }
      }
    })

    res.json({
      message: 'Carte supprimée des favoris'
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du favori:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Récupérer les commandes de l'utilisateur
router.get('/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { page = 1, limit = 10, status } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { userId }
    
    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.order.count({ where })
    ])

    res.json({
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

// Récupérer une commande spécifique
router.get('/orders/:orderId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { orderId } = req.params

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        items: true
      }
    })

    if (!order) {
      return res.status(404).json({
        error: 'Commande non trouvée',
        code: 'ORDER_NOT_FOUND'
      })
    }

    res.json({
      order
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error)
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR'
    })
  }
})

export default router
