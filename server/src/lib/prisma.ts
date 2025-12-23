import { PrismaClient } from '@prisma/client'
import logger from '../utils/logger.js'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    errorFormat: 'pretty',
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

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}

process.on('beforeExit', async () => {
  await prisma.$disconnect()
  logger.info('Prisma Client déconnecté proprement')
})

prisma.$on('error' as never, (e: any) => {
  logger.error('Erreur Prisma:', e)
})

export default prisma


