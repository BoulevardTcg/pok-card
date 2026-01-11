import { z } from 'zod';

// ============================================================================
// SCHEMAS DE BASE
// ============================================================================

/**
 * Schema pour une image de produit
 */
export const productImageSchema = z.object({
  url: z.string().min(1, 'URL requise').max(500, 'URL trop longue'),
  altText: z.string().max(200, 'Texte alternatif trop long').optional().nullable(),
  position: z.number().int().min(0).default(0),
});

/**
 * Schema pour une variante de produit
 */
export const productVariantSchema = z.object({
  id: z.string().optional(), // Pour les mises à jour
  name: z.string().min(1, 'Nom requis').max(200, 'Nom trop long'),
  language: z.string().max(50).optional().nullable(),
  edition: z.string().max(100).optional().nullable(),
  priceCents: z
    .number()
    .int('Le prix doit être un entier')
    .min(0, 'Le prix ne peut pas être négatif')
    .max(10000000, 'Prix trop élevé'), // Max 100,000€
  stock: z
    .number()
    .int('Le stock doit être un entier')
    .min(0, 'Le stock ne peut pas être négatif')
    .default(0),
  sku: z
    .string()
    .max(50, 'SKU trop long')
    .regex(/^[A-Z0-9-]+$/i, 'SKU invalide (lettres, chiffres et tirets uniquement)')
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});

// ============================================================================
// SCHEMAS POUR CRUD PRODUITS
// ============================================================================

/**
 * Schema pour la création d'un produit
 */
export const createProductSchema = z.object({
  name: z.string().min(1, 'Le nom est obligatoire').max(200, 'Nom trop long (max 200 caractères)'),
  slug: z
    .string()
    .min(1, 'Le slug est obligatoire')
    .max(200, 'Slug trop long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug invalide (minuscules, chiffres et tirets uniquement)'
    ),
  category: z.string().min(1, 'La catégorie est obligatoire').max(100, 'Catégorie trop longue'),
  description: z.string().max(5000, 'Description trop longue').optional().nullable(),
  images: z.array(productImageSchema).optional(),
  variants: z
    .array(productVariantSchema)
    .min(1, 'Au moins une variante est requise')
    .max(50, 'Trop de variantes (max 50)'),
});

/**
 * Schema pour la mise à jour d'un produit
 */
export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional().nullable(),
  images: z.array(productImageSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
});

/**
 * Schema pour les paramètres de liste des produits
 */
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
});

// ============================================================================
// SCHEMAS POUR STOCK
// ============================================================================

/**
 * Schema pour la mise à jour du stock
 */
export const updateStockSchema = z.object({
  stock: z.number().int('Le stock doit être un entier').min(0, 'Le stock ne peut pas être négatif'),
  reason: z.string().max(500, 'Raison trop longue').optional(),
});

// ============================================================================
// TYPES EXPORTÉS
// ============================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;

// ============================================================================
// MIDDLEWARE DE VALIDATION
// ============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Crée un middleware de validation à partir d'un schema Zod
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    req.body = result.data;
    next();
  };
}

/**
 * Crée un middleware de validation pour les query params
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        error: 'Paramètres invalides',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    // Remplacer les query params par les valeurs parsées/transformées
    req.query = result.data as any;
    next();
  };
}
