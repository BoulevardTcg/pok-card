import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, type Product, type ProductImage, type ProductVariant } from '@prisma/client';
import { getActiveReservedQty } from '../services/reservationService.js';
import { getOwnerKey } from '../utils/cartId.js';
import { optionalAuth } from '../middleware/auth.js';
import { productsLimiter } from '../middleware/security.js';

const router = Router();
const prisma = new PrismaClient();

type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
};

/**
 * Calcule le stock disponible pour toutes les variantes d'un produit
 * Utilise une seule requête pour récupérer toutes les réservations actives
 */
async function enrichVariantsWithAvailability(variants: ProductVariant[]): Promise<
  Array<
    ProductVariant & {
      reserved: number;
      available: number;
    }
  >
> {
  const variantIds = variants.map((v) => v.id);
  const now = new Date();

  // Récupérer toutes les réservations actives pour ces variantes en une seule requête
  // Gérer le cas où la table n'existe pas encore (migration pas encore appliquée)
  let reservations: Array<{ variantId: string; _sum: { quantity: number | null } }> = [];
  try {
    reservations = await prisma.cartReservation.groupBy({
      by: ['variantId'],
      where: {
        variantId: { in: variantIds },
        expiresAt: { gt: now },
      },
      _sum: {
        quantity: true,
      },
    });
  } catch (error: any) {
    // Si la table n'existe pas (P2021), continuer avec 0 réservations
    if (error?.code === 'P2021') {
      // Table n'existe pas encore, toutes les réservations sont à 0
      reservations = [];
    } else {
      throw error;
    }
  }

  const reservedMap = new Map(reservations.map((r) => [r.variantId, r._sum.quantity || 0]));

  return variants.map((variant) => {
    const reserved = reservedMap.get(variant.id) || 0;
    const available = Math.max(0, variant.stock - reserved);

    return {
      ...variant,
      reserved,
      available,
    };
  });
}

const toProductResponse = async (product: ProductWithRelations) => {
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const sortedVariants = [...activeVariants].sort((a, b) => a.priceCents - b.priceCents);

  // Enrichir les variantes avec le stock disponible
  const enrichedVariants = await enrichVariantsWithAvailability(activeVariants);

  const primaryImage = product.images.length > 0 ? product.images[0] : null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    image: primaryImage
      ? {
          url: primaryImage.url,
          altText: primaryImage.altText,
        }
      : null,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      position: image.position,
    })),
    variants: enrichedVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      language: variant.language,
      edition: variant.edition,
      priceCents: variant.priceCents,
      stock: variant.stock, // Stock total
      reserved: variant.reserved, // Stock réservé
      available: variant.available, // Stock disponible (stock - reserved)
      sku: variant.sku,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    })),
    minPriceCents: sortedVariants.length > 0 ? sortedVariants[0].priceCents : null,
    outOfStock: enrichedVariants.every((variant) => variant.available <= 0),
  };
};

// Utilise un limiter large (120/min) pour éviter de casser le front avec listProducts limit=500
router.get('/', productsLimiter, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limitParam = Number(req.query.limit ?? 12);
    const limit = Math.max(1, Math.min(Number.isNaN(limitParam) ? 12 : limitParam, 48));
    const category = req.query.category ? String(req.query.category) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      // Limiter la longueur de la recherche pour éviter les attaques
      const sanitizedSearch = String(search).slice(0, 100).trim();
      if (sanitizedSearch.length > 0) {
        // Recherche case-insensitive (insensible à la casse)
        // Prisma protège contre les injections SQL
        where.OR = [
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
          { description: { contains: sanitizedSearch, mode: 'insensitive' } },
        ];
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { priceCents: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Enrichir les produits avec le stock disponible (calculé avec les réservations)
    const enrichedProducts = await Promise.all(products.map(toProductResponse));

    res.json({
      products: enrichedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log('🔍 Recherche du produit avec slug:', slug);

    // Si c'est un ID numérique (ancien système), on cherche par ID
    const isNumericId = /^\d+$/.test(slug);

    let product;
    if (isNumericId) {
      // Ancien système avec IDs numériques - chercher par ID
      console.log('⚠️ ID numérique détecté, recherche par ID (ancien système)');
      product = await prisma.product.findUnique({
        where: { id: slug },
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { priceCents: 'asc' },
          },
        },
      });
    } else {
      // Nouveau système avec slugs
      product = await prisma.product.findUnique({
        where: { slug },
        include: {
          images: {
            orderBy: { position: 'asc' },
          },
          variants: {
            where: { isActive: true },
            orderBy: { priceCents: 'asc' },
          },
        },
      });
    }

    console.log('📦 Produit trouvé:', product ? product.name : 'Aucun');

    if (!product) {
      return res.status(404).json({
        error: 'Produit non trouvé',
        code: 'PRODUCT_NOT_FOUND',
        message: isNumericId
          ? "Ce produit utilise l'ancien système. Veuillez utiliser la nouvelle page produits."
          : "Le produit demandé n'existe pas.",
      });
    }

    const response = await toProductResponse(product);
    console.log('✅ Réponse formatée:', {
      id: response.id,
      name: response.name,
      variantsCount: response.variants.length,
    });

    res.json({ product: response });
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération du produit:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Endpoint pour enregistrer une notification de stock
router.post(
  '/notify-stock',
  [
    body('email').isEmail().withMessage('Email invalide'),
    body('productId').isString().notEmpty().withMessage('ID produit requis'),
    body('variantId').optional({ values: 'falsy' }).isString().withMessage('ID variante invalide'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('❌ Erreurs de validation:', errors.array());
        return res.status(400).json({
          error: errors.array()[0].msg,
          details: errors.array(),
        });
      }

      const { email, productId, variantId } = req.body;

      console.log('📧 Notification de stock demandée:', { email, productId, variantId });

      // Vérifier que le produit existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      // Vérifier si une notification existe déjà
      const existing = await prisma.stockNotification.findFirst({
        where: {
          email,
          productId,
          variantId: variantId || null,
        },
      });

      if (existing) {
        return res.status(200).json({
          message: 'Vous êtes déjà inscrit pour être notifié de ce produit',
          alreadyExists: true,
        });
      }

      // Créer la notification
      await prisma.stockNotification.create({
        data: {
          email,
          productId,
          variantId: variantId || null,
        },
      });

      res.status(201).json({
        message:
          'Votre demande a été enregistrée. Vous recevrez un email dès que le produit sera disponible.',
      });
    } catch (error: any) {
      console.error("❌ Erreur lors de l'enregistrement de la notification:", error);
      console.error('Stack:', error.stack);
      console.error('Message:', error.message);
      console.error('Code:', error.code);

      // Vérifier si c'est une erreur de table manquante
      if (
        error.code === 'P2001' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('Unknown model')
      ) {
        return res.status(503).json({
          error:
            "La fonctionnalité de notification n'est pas encore disponible. La migration de base de données doit être appliquée.",
          code: 'MIGRATION_REQUIRED',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }

      res.status(500).json({
        error: "Erreur lors de l'enregistrement",
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/products/variants/stock
 * Récupère le stock et le prix pour plusieurs variants en une seule requête
 *
 * Body:
 * {
 *   "variantIds": ["variantId1", "variantId2", ...] (max 200)
 * }
 *
 * Réponse:
 * {
 *   "variantId1": {
 *     "available": 10,        // Stock disponible (totalStock - réservations globales)
 *     "reservedByMe": 2,      // Réservations actives de cet ownerKey
 *     "maxAllowed": 12,       // available + reservedByMe (quantité max autorisée)
 *     "priceCents": 1999,
 *     "stock": 10             // Alias pour available (rétrocompatibilité)
 *   },
 *   ...
 * }
 */
router.post(
  '/variants/stock',
  optionalAuth,
  [
    body('variantIds')
      .isArray({ min: 1, max: 200 })
      .withMessage('variantIds doit être un tableau de 1 à 200 éléments'),
    body('variantIds.*')
      .isString()
      .notEmpty()
      .withMessage('Chaque variantId doit être une chaîne non vide'),
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

      const { variantIds } = req.body as { variantIds: string[] };

      // Récupérer l'ownerKey (user:userId ou cart:cartId) pour calculer reservedByMe
      const ownerKey = getOwnerKey(req, res);

      // Récupérer les variants
      const variants = await prisma.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
        },
        select: {
          id: true,
          stock: true,
          priceCents: true,
        },
      });

      const now = new Date();

      // Calculer reservedTotal : réservations actives pour tous les owners
      // Gérer le cas où la table n'existe pas encore (migration pas encore appliquée)
      let reservedTotal: Array<{ variantId: string; _sum: { quantity: number | null } }> = [];
      let reservedByMe: Array<{ variantId: string; _sum: { quantity: number | null } }> = [];
      try {
        reservedTotal = await prisma.cartReservation.groupBy({
          by: ['variantId'],
          where: {
            variantId: { in: variantIds },
            expiresAt: { gt: now },
          },
          _sum: {
            quantity: true,
          },
        });

        // Calculer reservedByMe : réservations actives pour cet ownerKey spécifique
        reservedByMe = await prisma.cartReservation.groupBy({
          by: ['variantId'],
          where: {
            variantId: { in: variantIds },
            ownerKey: ownerKey,
            expiresAt: { gt: now },
          },
          _sum: {
            quantity: true,
          },
        });
      } catch (error: any) {
        // Si la table n'existe pas (P2021), continuer avec 0 réservations
        if (error?.code === 'P2021') {
          // Table n'existe pas encore, toutes les réservations sont à 0
          reservedTotal = [];
          reservedByMe = [];
        } else {
          throw error;
        }
      }

      const reservedTotalMap = new Map(
        reservedTotal.map((r) => [r.variantId, r._sum.quantity || 0])
      );
      const reservedByMeMap = new Map(reservedByMe.map((r) => [r.variantId, r._sum.quantity || 0]));

      // Construire la réponse avec available, reservedByMe, maxAllowed
      // available = stock total - réservations globales (ce qui reste disponible pour tous)
      // maxAllowed = available + reservedByMe (quantité max que cet utilisateur peut avoir)
      const stockMap: Record<
        string,
        {
          available: number;
          reservedByMe: number;
          maxAllowed: number;
          priceCents: number;
          stock: number; // Alias pour rétrocompatibilité
        }
      > = {};

      variants.forEach((variant) => {
        const reservedTotal = reservedTotalMap.get(variant.id) || 0;
        const reservedByMeCount = reservedByMeMap.get(variant.id) || 0;
        const available = Math.max(0, variant.stock - reservedTotal);
        const maxAllowed = available + reservedByMeCount;

        stockMap[variant.id] = {
          available, // Stock disponible globalement
          reservedByMe: reservedByMeCount, // Réservations de cet owner
          maxAllowed, // Quantité max autorisée pour cet owner (available + ses réservations)
          priceCents: variant.priceCents,
          stock: available, // Alias pour rétrocompatibilité
        };
      });

      res.json(stockMap);
    } catch (error: any) {
      console.error('Erreur lors de la récupération du stock des variants:', error);
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

export default router;
