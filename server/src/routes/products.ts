import { Router } from 'express';
import { PrismaClient, type Product, type ProductImage, type ProductVariant } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

type ProductWithRelations = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
};

const toProductResponse = (product: ProductWithRelations) => {
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const sortedVariants = [...activeVariants].sort((a, b) => a.priceCents - b.priceCents);

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
    variants: activeVariants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      language: variant.language,
      edition: variant.edition,
      priceCents: variant.priceCents,
      stock: variant.stock,
      sku: variant.sku,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    })),
    minPriceCents: sortedVariants.length > 0 ? sortedVariants[0].priceCents : null,
    outOfStock:
      activeVariants.length === 0 || activeVariants.every((variant) => variant.stock <= 0),
  };
};

router.get('/', async (req, res) => {
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

    res.json({
      products: products.map(toProductResponse),
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

    const response = toProductResponse(product);
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

export default router;
