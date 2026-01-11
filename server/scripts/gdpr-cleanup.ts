/**
 * Script de purge RGPD
 *
 * Ce script supprime les données périmées conformément à la politique de rétention :
 * - RefreshTokens expirés
 * - Comptes non vérifiés de plus de 30 jours
 * - Comptes programmés pour suppression
 * - Notifications de stock anciennes
 *
 * Usage : npx tsx scripts/gdpr-cleanup.ts
 * Recommandé : exécuter quotidiennement via CRON
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupStats {
  expiredTokens: number;
  unverifiedAccounts: number;
  scheduledDeletions: number;
  oldStockNotifications: number;
  errors: string[];
}

async function cleanupExpiredRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}

async function cleanupUnverifiedAccounts(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Trouver les comptes non vérifiés de plus de 30 jours
  const unverifiedUsers = await prisma.user.findMany({
    where: {
      isVerified: false,
      isAdmin: false, // Ne jamais supprimer les admins
      createdAt: {
        lt: thirtyDaysAgo,
      },
      // Ne pas supprimer s'il y a des commandes
      orders: {
        none: {},
      },
    },
    select: { id: true, email: true, username: true },
  });

  if (unverifiedUsers.length === 0) {
    return 0;
  }

  // Supprimer les comptes
  const result = await prisma.user.deleteMany({
    where: {
      id: {
        in: unverifiedUsers.map((u) => u.id),
      },
    },
  });

  // Log pour audit
  console.log(
    `🗑️  Comptes non vérifiés supprimés: ${unverifiedUsers.map((u) => u.username).join(', ')}`
  );

  return result.count;
}

async function processScheduledDeletions(): Promise<number> {
  const now = new Date();

  // Trouver les comptes dont la suppression est programmée et dont la date est passée
  const usersToDelete = await prisma.user.findMany({
    where: {
      deletionScheduledAt: {
        lte: now,
      },
      isAdmin: false, // Sécurité : ne jamais supprimer les admins automatiquement
    },
    select: { id: true, email: true, username: true },
  });

  if (usersToDelete.length === 0) {
    return 0;
  }

  // Supprimer les comptes
  const result = await prisma.user.deleteMany({
    where: {
      id: {
        in: usersToDelete.map((u) => u.id),
      },
    },
  });

  // Log pour audit
  console.log(
    `🗑️  Comptes supprimés (demande RGPD): ${usersToDelete.map((u) => u.username).join(', ')}`
  );

  return result.count;
}

async function cleanupOldStockNotifications(): Promise<number> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Supprimer les notifications de stock de plus de 90 jours
  const result = await prisma.stockNotification.deleteMany({
    where: {
      OR: [
        // Notifications envoyées de plus de 90 jours
        {
          notified: true,
          notifiedAt: {
            lt: ninetyDaysAgo,
          },
        },
        // Notifications non envoyées de plus de 90 jours
        {
          notified: false,
          createdAt: {
            lt: ninetyDaysAgo,
          },
        },
      ],
    },
  });

  return result.count;
}

async function main() {
  console.log('🧹 Démarrage du nettoyage RGPD...\n');
  console.log(`📅 Date: ${new Date().toISOString()}\n`);

  const stats: CleanupStats = {
    expiredTokens: 0,
    unverifiedAccounts: 0,
    scheduledDeletions: 0,
    oldStockNotifications: 0,
    errors: [],
  };

  // 1. Nettoyer les refresh tokens expirés
  try {
    stats.expiredTokens = await cleanupExpiredRefreshTokens();
    console.log(`✅ Refresh tokens expirés supprimés: ${stats.expiredTokens}`);
  } catch (error) {
    const msg = `Erreur refresh tokens: ${error}`;
    console.error(`❌ ${msg}`);
    stats.errors.push(msg);
  }

  // 2. Nettoyer les comptes non vérifiés
  try {
    stats.unverifiedAccounts = await cleanupUnverifiedAccounts();
    console.log(`✅ Comptes non vérifiés (>30j) supprimés: ${stats.unverifiedAccounts}`);
  } catch (error) {
    const msg = `Erreur comptes non vérifiés: ${error}`;
    console.error(`❌ ${msg}`);
    stats.errors.push(msg);
  }

  // 3. Traiter les suppressions programmées
  try {
    stats.scheduledDeletions = await processScheduledDeletions();
    console.log(`✅ Comptes supprimés (demande RGPD): ${stats.scheduledDeletions}`);
  } catch (error) {
    const msg = `Erreur suppressions programmées: ${error}`;
    console.error(`❌ ${msg}`);
    stats.errors.push(msg);
  }

  // 4. Nettoyer les notifications de stock anciennes
  try {
    stats.oldStockNotifications = await cleanupOldStockNotifications();
    console.log(`✅ Notifications de stock (>90j) supprimées: ${stats.oldStockNotifications}`);
  } catch (error) {
    const msg = `Erreur notifications stock: ${error}`;
    console.error(`❌ ${msg}`);
    stats.errors.push(msg);
  }

  // Résumé
  console.log('\n📊 Résumé du nettoyage:');
  console.log(`   - Refresh tokens: ${stats.expiredTokens}`);
  console.log(`   - Comptes non vérifiés: ${stats.unverifiedAccounts}`);
  console.log(`   - Demandes de suppression: ${stats.scheduledDeletions}`);
  console.log(`   - Notifications stock: ${stats.oldStockNotifications}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Erreurs rencontrées: ${stats.errors.length}`);
    stats.errors.forEach((e) => console.log(`   - ${e}`));
    process.exit(1);
  }

  console.log('\n✅ Nettoyage RGPD terminé avec succès!');
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
