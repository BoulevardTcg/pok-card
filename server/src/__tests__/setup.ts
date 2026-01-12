import { PrismaClient } from '@prisma/client';

// Utiliser une base de données de test séparée
// Les variables d'environnement sont chargées dans vitest.setup.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Nettoyer la base de données avant les tests
export async function cleanupDatabase() {
  // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  // Nettoyer les réservations si la table existe (gère le cas où la migration n'est pas encore appliquée)
  try {
    await prisma.cartReservation.deleteMany();
  } catch (error: any) {
    // Ignorer l'erreur P2021 (table does not exist) - la table sera créée par la migration
    if (error?.code !== 'P2021') {
      throw error;
    }
  }
  await prisma.refreshToken.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
}

// Créer un utilisateur de test
export async function createTestUser(overrides?: {
  email?: string;
  username?: string;
  password?: string;
  isAdmin?: boolean;
}) {
  const { hashPassword } = await import('../utils/auth.js');

  const user = await prisma.user.create({
    data: {
      email: overrides?.email || `test-${Date.now()}@example.com`,
      username: overrides?.username || `testuser-${Date.now()}`,
      password: await hashPassword(overrides?.password || 'TestPassword123!'),
      isAdmin: overrides?.isAdmin || false,
    },
  });

  // Créer le profil utilisateur
  await prisma.userProfile.create({
    data: {
      userId: user.id,
    },
  });

  return user;
}

// Créer un produit de test avec une variante
export async function createTestProduct(overrides?: {
  name?: string;
  priceCents?: number;
  stock?: number;
}) {
  const product = await prisma.product.create({
    data: {
      name: overrides?.name || `Test Product ${Date.now()}`,
      slug: `test-product-${Date.now()}`,
      description: 'Test product description',
      category: 'Test',
      variants: {
        create: {
          name: 'Standard',
          priceCents: overrides?.priceCents || 1000,
          stock: overrides?.stock || 10,
        },
      },
    },
    include: {
      variants: true,
    },
  });

  return product;
}

// Créer une variante de produit (helper pour tests)
export async function createProductVariant(
  productId: string,
  overrides?: {
    name?: string;
    priceCents?: number;
    stock?: number;
    isActive?: boolean;
  }
) {
  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: overrides?.name || 'Standard',
      priceCents: overrides?.priceCents || 1000,
      stock: overrides?.stock ?? 10,
      isActive: overrides?.isActive ?? true,
    },
  });
  return variant;
}

// Fonctions utilitaires pour la connexion/disconnexion
export async function connectDatabase() {
  await prisma.$connect();
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export { prisma };
