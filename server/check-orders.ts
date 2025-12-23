import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: true }
  })
  
  console.log('📦 Commandes trouvées:', orders.length)
  
  if (orders.length === 0) {
    console.log('❌ Aucune commande dans la base de données')
  } else {
    orders.forEach(o => {
      console.log(`  - ${o.orderNumber} | userId: ${o.userId || 'anonyme'} | status: ${o.status} | total: ${o.totalCents/100}€`)
      console.log(`    Items: ${o.items.length}`)
    })
  }
  
  // Vérifier les utilisateurs
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true }
  })
  console.log('\n👤 Utilisateurs:', users.length)
  users.forEach(u => console.log(`  - ${u.email} (${u.id})`))
  
  await prisma.$disconnect()
}

main().catch(console.error)

