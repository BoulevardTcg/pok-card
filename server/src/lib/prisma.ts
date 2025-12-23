import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger.js'

/**
 * Prisma Client avec configuration optimisée pour PostgreSQL
 * 
 * Bonnes pratiques :
 * - Connection pooling automatique via Prisma
 * - Gestion propre des connexions
 * - Logs d'erreur structurés
 * - Ready pour production
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
    // Configuration pour PostgreSQL
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

// Singleton pattern pour éviter les connexions multiples en développement
// En production, chaque instance Node.js aura son propre client
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

// Gestion propre de la déconnexion
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  logger.info('Prisma Client déconnecté proprement')
})

// Gestion des erreurs de connexion
prisma.$on('error' as never, (e: any) => {
  logger.error('Erreur Prisma:', e)
})

export default prisma


