import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

const upsertAdminUsers = async () => {
  // Vérifier si l'admin existe déjà par email ou username
  const existingAdminByEmail = await prisma.user.findUnique({
    where: { email: 'admin@boulevardtcg.com' }
  })

  const existingAdminByUsername = await prisma.user.findUnique({
    where: { username: 'admin' }
  })

  if (existingAdminByEmail || existingAdminByUsername) {
    console.log('👑 L\'utilisateur admin existe déjà')
    return
  }

  // Créer l'utilisateur admin
  const hashedPassword = await bcrypt.hash('Admin123!', 12)

  try {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@boulevardtcg.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'BoulevardTCG',
        isAdmin: true,
        isVerified: true
      }
    })

    // Vérifier si le profil existe déjà
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: admin.id }
    })

    if (!existingProfile) {
      // Créer le profil admin seulement s'il n'existe pas
      await prisma.userProfile.create({
        data: {
          userId: admin.id,
          phone: '+33 1 23 45 67 89',
          address: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          country: 'France'
        }
      })
    }

    console.log('👑 Utilisateur admin créé:', admin.email)
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('👑 L\'utilisateur admin existe déjà (contrainte d\'unicité)')
    } else {
      throw error
    }
  }
}

const upsertTestUsers = async () => {
  const testUsers = [
    {
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: 'Test123!',
      firstName: 'John',
      lastName: 'Doe'
    },
    {
      email: 'jane.smith@example.com',
      username: 'janesmith',
      password: 'Test123!',
      firstName: 'Jane',
      lastName: 'Smith'
    }
  ]

  for (const userData of testUsers) {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: userData.email }
    })

    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: userData.username }
    })

    if (!existingUserByEmail && !existingUserByUsername) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 12)

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isVerified: true
          }
        })

        // Vérifier si le profil existe déjà
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId: user.id }
        })

        if (!existingProfile) {
          await prisma.userProfile.create({
            data: {
              userId: user.id
            }
          })
        }

        console.log('👤 Utilisateur de test créé:', user.email)
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`👤 Utilisateur de test ${userData.email} existe déjà (contrainte d'unicité)`)
        } else {
          console.error(`❌ Erreur lors de la création de l'utilisateur ${userData.email}:`, error.message)
        }
      }
    } else {
      console.log(`👤 Utilisateur de test ${userData.email} existe déjà`)
    }
  }
}

// Fonction pour générer un slug à partir d'un nom
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Fonction pour générer un SKU à partir du nom et de l'édition
function generateSKU(name: string, editionCode?: string, language: string = 'FR'): string {
  const prefix = name
    .split(' ')
    .map(word => word.substring(0, 3).toUpperCase())
    .join('-')
    .substring(0, 15)
  const edition = editionCode ? `-${editionCode}` : ''
  return `${prefix}${edition}-${language}`
}

// Fonction pour supprimer tous les produits existants
const deleteAllProducts = async () => {
  console.log('🗑️  Suppression des anciens produits...')
  try {
    // Compter d'abord les produits existants
    const countBefore = await prisma.product.count()
    console.log(`📊 ${countBefore} produits trouvés dans la base de données`)
    
    // Supprimer tous les produits (les images et variantes seront supprimées en cascade)
    const deletedProducts = await prisma.product.deleteMany({})
    console.log(`✅ ${deletedProducts.count} produits supprimés`)
    
    // Vérifier que tout est bien supprimé
    const countAfter = await prisma.product.count()
    if (countAfter > 0) {
      console.warn(`⚠️  Attention: ${countAfter} produits restent encore dans la base de données`)
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression des produits:', error.message)
    throw error
  }
}

const seedProducts = async () => {
  console.log('🛒 Début du seeding des produits...')

  // Supprimer les anciens produits avant de créer les nouveaux
  await deleteAllProducts()

  // NOTE: Produits créés à partir des images dans pokecard/public/img/products/
  // Les images locales utilisent le chemin : '/img/products/nom-image.ext'
  // Les champs marqués avec "TODO:" doivent être remplis manuellement

  const productsData = [
    // === POKÉMON ===
    {
      name: 'Booster Flammes Fantasmagoriques',
      slug: 'booster-flammes-fantasmagorique',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/booster-flammes-fantasmagorique.avif',
          altText: 'Booster Flammes Fantasmagoriques',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-SKU'
        }
      ]
    },
    {
      name: 'Coffret Pokémon EV10 ETB',
      slug: 'coffret-pokemon-ev10-etb',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/coffret-pokemon-ev10-ETB.png',
          altText: 'Coffret Pokémon EV10 ETB',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'EV10',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-EV10-ETB'
        }
      ]
    },
    {
      name: 'Display Pokémon ME02 Flammes Fantasmagoriques',
      slug: 'display-pokemon-me02-flammes-fantasmagoriques',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/display-pokemon-me02-flammes-fantasmagoriques.jpg',
          altText: 'Display Pokémon ME02 Flammes Fantasmagoriques',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'ME02',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-ME02-DISPLAY'
        }
      ]
    },
    {
      name: 'ETB Foudre Noir Flamme Blanche EV105',
      slug: 'etb-foudre-noir-flamme-blanche-ev105',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/etb-foudre-noir-flamme-blanche-ev105.jpg',
          altText: 'ETB Foudre Noir Flamme Blanche EV105',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'EV105',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-EV105-ETB'
        }
      ]
    },
    {
      name: 'ETB Méga-Évolution Gardevoir',
      slug: 'etb-mega-evolution-gardevoir',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/ETB-MegaEvolution-Gardevoir.jpg',
          altText: 'ETB Méga-Évolution Gardevoir',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-GARDEVOIR-ETB'
        }
      ]
    },
    {
      name: 'Méga-Évolution Héros Transcendants Elite Trainer Box',
      slug: 'mega-evolution-heros-transcendants-etb',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Mega_Evolution—Heros_Transcendants_Elite_Trainer_Box_FR.webp',
          altText: 'Méga-Évolution Héros Transcendants Elite Trainer Box',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-HEROS-ETB'
        }
      ]
    },
    {
      name: 'Pokémon ETB Flammes Blanches',
      slug: 'pokemon-etb-flammes-blanches',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Pokemon-ETB-flammes-blanches.jpg',
          altText: 'Pokémon ETB Flammes Blanches',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-FLAMMES-BLANCHES-ETB'
        }
      ]
    },
    {
      name: 'Pokémon ETB Flammes Fantasmagoriques ME02',
      slug: 'pokemon-etb-flammes-fantasmagoriques-me02',
      category: 'Pokémon',
      description: 'Coffret Dresseur d\'Élite Flammes Fantasmagoriques ME02',
      images: [
        {
          url: '/img/products/Pokemon-ETB-Flammes-Fantasmagoriques-ME02-Coffret-Dresseur-dElite-en-francais.jpg',
          altText: 'Pokémon ETB Flammes Fantasmagoriques ME02',
          position: 0
        }
      ],
      variants: [
        {
          name: 'ETB Flammes Fantasmagoriques ME02',
          language: 'Français',
          edition: 'ME02',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'ME02-ETB'
        }
      ]
    },
    {
      name: 'Pokémon TCG Méga-Évolution Elite Trainer Box Lucario',
      slug: 'pokemon-tcg-mega-evolution-elite-trainer-box-lucario',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Pokemon-TCG-Mega-Evolution-Elite-Trainer-Box-Lucario-ETB-Booster-EAN-GTIN-0196214129160.jpg',
          altText: 'Pokémon TCG Méga-Évolution Elite Trainer Box Lucario',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-LUCARIO-ETB'
        }
      ]
    },
    {
      name: 'UPC Flammes Fantasmagoriques',
      slug: 'upc-flammes-fantasmagorique',
      category: 'Pokémon',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/UPC-Flammes-Fantasmagorique.png',
          altText: 'UPC Flammes Fantasmagoriques',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'TODO: Édition',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-UPC-FLAMMES'
        }
      ]
    },
    // === ONE PIECE ===
    {
      name: 'Display One Piece OP09',
      slug: 'display-one-piece-op09',
      category: 'One Piece',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Display-OP09.png',
          altText: 'Display One Piece OP09',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'OP09',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-OP09-DISPLAY'
        }
      ]
    },
    {
      name: 'Display One Piece OP11',
      slug: 'display-one-piece-op11',
      category: 'One Piece',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Display-OP11.png',
          altText: 'Display One Piece OP11',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'OP11',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-OP11-DISPLAY'
        }
      ]
    },
    {
      name: 'Display One Piece OP12',
      slug: 'display-one-piece-op12',
      category: 'One Piece',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Display-OP12.png',
          altText: 'Display One Piece OP12',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'OP12',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TODO-OP12-DISPLAY'
        }
      ]
    },
    {
      name: 'Display One Piece OP13',
      slug: 'display-one-piece-op13',
      category: 'One Piece',
      description: 'TODO: Description à compléter',
      images: [
        {
          url: '/img/products/Display-OP13.png',
          altText: 'Display One Piece OP13',
          position: 0
        }
      ],
      variants: [
        {
          name: 'TODO: Nom variante',
          language: 'Français',
          edition: 'OP13',
          priceCents: 15900, // TODO: Prix à définir
          stock: 10, // TODO: Stock à définir
          sku: 'TODO-OP13-DISPLAY'
        }
      ]
    },
    // === PROTECTIONS ===
    {
      name: 'TODO: Protection Acrylique ETB',
      slug: 'protection-acrylique-etb',
      category: 'Accessoires',
      description: 'Protection acrylique transparente pour Elite Trainer Box. Protège votre ETB de la poussière, de l\'humidité et des rayures.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Protection Acrylique ETB',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Protection Acrylique ETB Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'PROT-ACRYL-ETB-STD'
        }
      ]
    },
    {
      name: 'TODO: Protection Acrylique UPC',
      slug: 'protection-acrylique-upc',
      category: 'Accessoires',
      description: 'Protection acrylique transparente pour Ultra Premium Collection. Protection premium pour vos coffrets les plus précieux.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Protection Acrylique UPC',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Protection Acrylique UPC Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'PROT-ACRYL-UPC-STD'
        }
      ]
    },
    {
      name: 'TODO: Card Saver Premium',
      slug: 'card-saver-premium',
      category: 'Accessoires',
      description: 'Card saver de qualité premium pour protéger vos cartes individuelles. Compatible avec toutes les tailles de cartes TCG.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Card Saver Premium',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Card Saver Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'CARD-SAVER-STD'
        },
        {
          name: 'Card Saver Premium',
          language: 'Français',
          edition: 'Premium',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'CARD-SAVER-PREM'
        }
      ]
    },
    {
      name: 'TODO: Classeur TCG Premium',
      slug: 'classeur-tcg-premium',
      category: 'Accessoires',
      description: 'Classeur premium avec pages protectrices pour organiser et protéger votre collection de cartes TCG. Capacité de 360 cartes.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Classeur TCG Premium',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Classeur 360 cartes',
          language: 'Français',
          edition: '360 cartes',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'CLASS-TCG-360'
        },
        {
          name: 'Classeur 480 cartes',
          language: 'Français',
          edition: '480 cartes',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'CLASS-TCG-480'
        }
      ]
    },
    {
      name: 'TODO: Sleeves Premium',
      slug: 'sleeves-premium',
      category: 'Accessoires',
      description: 'Sleeves de protection premium pour vos cartes. Protection transparente et résistante contre l\'usure et les rayures.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Sleeves Premium',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Sleeves Standard (100 unités)',
          language: 'Français',
          edition: 'Standard',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'SLEEVES-STD-100'
        },
        {
          name: 'Sleeves Premium (100 unités)',
          language: 'Français',
          edition: 'Premium',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'SLEEVES-PREM-100'
        }
      ]
    },
    {
      name: 'TODO: Toploader Premium',
      slug: 'toploader-premium',
      category: 'Accessoires',
      description: 'Toploader rigide pour protéger vos cartes les plus précieuses. Compatible avec les card saver et les sleeves.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Toploader Premium',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Toploader Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TOPLOADER-STD'
        },
        {
          name: 'Toploader Premium',
          language: 'Français',
          edition: 'Premium',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'TOPLOADER-PREM'
        }
      ]
    },
    {
      name: 'TODO: Boîte de Stockage TCG',
      slug: 'boite-stockage-tcg',
      category: 'Accessoires',
      description: 'Boîte de stockage robuste pour organiser et protéger vos cartes. Idéale pour le transport et le rangement.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Boîte de Stockage TCG',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Boîte 800 cartes',
          language: 'Français',
          edition: '800 cartes',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'BOITE-TCG-800'
        },
        {
          name: 'Boîte 1600 cartes',
          language: 'Français',
          edition: '1600 cartes',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'BOITE-TCG-1600'
        }
      ]
    },
    {
      name: 'TODO: Pages Protectrices Binder',
      slug: 'pages-protectrices-binder',
      category: 'Accessoires',
      description: 'Pages protectrices pour classeur. Compatibles avec tous les formats de cartes TCG. Protection optimale contre la poussière et l\'humidité.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Pages Protectrices Binder',
          position: 0
        }
      ],
      variants: [
        {
          name: 'Pages 9 emplacements',
          language: 'Français',
          edition: '9 emplacements',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'PAGES-BINDER-9'
        },
        {
          name: 'Pages 12 emplacements',
          language: 'Français',
          edition: '12 emplacements',
          priceCents: 0, // TODO: Prix à définir
          stock: 0, // TODO: Stock à définir
          sku: 'PAGES-BINDER-12'
        }
      ]
    }
  ]

  let createdCount = 0
  let errorCount = 0

  for (const product of productsData) {
    try {
      // Créer le produit (pas besoin de vérifier l'existence car tout a été supprimé)
      await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          category: product.category,
          description: product.description,
          images: {
            create: product.images
          },
          variants: {
            create: product.variants
          }
        }
      })
      console.log(`✅ Produit créé: ${product.name}`)
      createdCount++
    } catch (error: any) {
      // Si le produit existe déjà (ne devrait pas arriver après deleteAllProducts), on le met à jour
      if (error.code === 'P2002') {
        console.log(`⚠️  Produit déjà existant, mise à jour: ${product.name}`)
        try {
          await prisma.product.update({
            where: { slug: product.slug },
            data: {
              name: product.name,
              category: product.category,
              description: product.description,
              // Supprimer les anciennes images et variantes
              images: {
                deleteMany: {},
                create: product.images
              },
              variants: {
                deleteMany: {},
                create: product.variants
              }
            }
          })
          console.log(`✅ Produit mis à jour: ${product.name}`)
          createdCount++
        } catch (updateError: any) {
          console.error(`❌ Erreur lors de la mise à jour du produit ${product.name}:`, updateError.message)
          errorCount++
        }
      } else {
        console.error(`❌ Erreur lors de la création du produit ${product.name}:`, error.message)
        errorCount++
      }
    }
  }

  console.log(`🛒 Seeding terminé: ${createdCount} produits créés/mis à jour, ${errorCount} erreurs`)
}

async function main() {
  console.log('🌱 Début du seeding...')

  await upsertAdminUsers()
  await upsertTestUsers()
  await seedProducts()

  console.log('✅ Seeding terminé avec succès!')
  console.log('\n📋 Informations de connexion:')
  console.log('👑 Admin: admin@boulevardtcg.com / Admin123!')
  console.log('👤 Test 1: john.doe@example.com / Test123!')
  console.log('👤 Test 2: jane.smith@example.com / Test123!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
