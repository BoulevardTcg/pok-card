import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Utiliser une base de données de test séparée
const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL is not defined');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

// Nettoyer la base de données avant les tests
export async function cleanupDatabase() {
  // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
  await prisma.orderEvent.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
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

export { prisma };
