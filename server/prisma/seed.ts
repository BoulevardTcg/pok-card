import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION VIA VARIABLES D'ENVIRONNEMENT (SECURITE)
// ============================================================================

// Admin credentials - DOIVENT être définis via .env en production
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_FIRST_NAME = process.env.SEED_ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.SEED_ADMIN_LAST_NAME || 'User';

// Test users credentials - uniquement pour dev
const TEST_USER_PASSWORD = process.env.SEED_TEST_PASSWORD;

// Flag pour activer/désactiver la création d'utilisateurs de test
const CREATE_TEST_USERS = process.env.SEED_CREATE_TEST_USERS === 'true';

// ============================================================================
// VALIDATION DES VARIABLES D'ENVIRONNEMENT
// ============================================================================

function validateSeedConfig(): void {
  const errors: string[] = [];

  if (!ADMIN_PASSWORD) {
    errors.push("SEED_ADMIN_PASSWORD est requis pour créer l'utilisateur admin");
  }

  if (ADMIN_PASSWORD && ADMIN_PASSWORD.length < 8) {
    errors.push('SEED_ADMIN_PASSWORD doit contenir au moins 8 caractères');
  }

  if (CREATE_TEST_USERS && !TEST_USER_PASSWORD) {
    errors.push('SEED_TEST_PASSWORD est requis quand SEED_CREATE_TEST_USERS=true');
  }

  if (errors.length > 0) {
    console.error('❌ Erreurs de configuration du seed:');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('\n📝 Consultez env.example pour la configuration requise');
    process.exit(1);
  }
}

// ============================================================================
// FONCTIONS DE SEEDING
// ============================================================================

const upsertAdminUsers = async () => {
  // Vérifier si l'admin existe déjà par email ou username
  const existingAdminByEmail = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  const existingAdminByUsername = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME },
  });

  if (existingAdminByEmail || existingAdminByUsername) {
    console.log("👑 L'utilisateur admin existe déjà");
    return;
  }

  // Créer l'utilisateur admin
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD!, 12);

  try {
    const admin = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        password: hashedPassword,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        isAdmin: true,
        isVerified: true,
      },
    });

    // Créer le profil admin
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: admin.id },
    });

    if (!existingProfile) {
      await prisma.userProfile.create({
        data: {
          userId: admin.id,
        },
      });
    }

    console.log('👑 Utilisateur admin créé avec succès');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log("👑 L'utilisateur admin existe déjà (contrainte d'unicité)");
    } else {
      throw error;
    }
  }
};

const upsertTestUsers = async () => {
  if (!CREATE_TEST_USERS) {
    console.log('👤 Création des utilisateurs de test désactivée (SEED_CREATE_TEST_USERS != true)');
    return;
  }

  const testUsers = [
    {
      email: 'test1@example.com',
      username: 'testuser1',
      firstName: 'Test',
      lastName: 'User1',
    },
    {
      email: 'test2@example.com',
      username: 'testuser2',
      firstName: 'Test',
      lastName: 'User2',
    },
  ];

  for (const userData of testUsers) {
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: userData.username },
    });

    if (!existingUserByEmail && !existingUserByUsername) {
      try {
        const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD!, 12);

        const user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            password: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            isVerified: true,
          },
        });

        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
        });

        if (!existingProfile) {
          await prisma.userProfile.create({
            data: {
              userId: user.id,
            },
          });
        }

        console.log(`👤 Utilisateur de test créé: ${userData.username}`);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`👤 Utilisateur de test ${userData.username} existe déjà`);
        } else {
          console.error(`❌ Erreur création utilisateur ${userData.username}:`, error.message);
        }
      }
    } else {
      console.log(`👤 Utilisateur de test ${userData.username} existe déjà`);
    }
  }
};

// Fonction pour supprimer tous les produits existants
const deleteAllProducts = async () => {
  console.log('🗑️  Suppression des anciens produits...');
  try {
    const countBefore = await prisma.product.count();
    console.log(`📊 ${countBefore} produits trouvés dans la base de données`);

    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ ${deletedProducts.count} produits supprimés`);

    const countAfter = await prisma.product.count();
    if (countAfter > 0) {
      console.warn(`⚠️  Attention: ${countAfter} produits restent encore dans la base de données`);
    }
  } catch (error: any) {
    console.error('❌ Erreur lors de la suppression des produits:', error.message);
    throw error;
  }
};

const seedProducts = async () => {
  console.log('🛒 Début du seeding des produits...');

  await deleteAllProducts();

  const productsData = [
    // === POKÉMON ===
    {
      name: 'Booster Flammes Fantasmagoriques',
      slug: 'booster-flammes-fantasmagorique',
      category: 'Pokémon',
      description:
        "Booster de 11 cartes de l'extension Flammes Fantasmagoriques. Découvrez de nouvelles cartes Pokémon avec des illustrations époustouflantes et des effets puissants.",
      images: [
        {
          url: '/img/products/booster-flammes-fantasmagorique.avif',
          altText: 'Booster Flammes Fantasmagoriques',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'Booster Flammes Fantasmagoriques',
          language: 'Français',
          edition: 'ME02',
          priceCents: 550,
          stock: 0,
          sku: 'BOO-FLA-FAN-ME02',
        },
      ],
    },
    {
      name: 'Coffret Pokémon EV10 ETB',
      slug: 'coffret-pokemon-ev10-etb',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite (ETB) de l'extension EV10.",
      images: [
        {
          url: '/img/products/coffret-pokemon-ev10-ETB.png',
          altText: 'Coffret Pokémon EV10 ETB',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB EV10',
          language: 'Français',
          edition: 'EV10',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-EV10-FR',
        },
      ],
    },
    {
      name: 'Display Pokémon ME02 Flammes Fantasmagoriques',
      slug: 'display-pokemon-me02-flammes-fantasmagoriques',
      category: 'Pokémon',
      description: "Display de 36 boosters de l'extension Flammes Fantasmagoriques ME02.",
      images: [
        {
          url: '/img/products/display-pokemon-me02-flammes-fantasmagoriques.jpg',
          altText: 'Display Pokémon ME02 Flammes Fantasmagoriques',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'Display ME02 Flammes Fantasmagoriques',
          language: 'Français',
          edition: 'ME02',
          priceCents: 18900,
          stock: 0,
          sku: 'DIS-ME02-FLA-FAN',
        },
      ],
    },
    {
      name: 'ETB Foudre Noir Flamme Blanche EV105',
      slug: 'etb-foudre-noir-flamme-blanche-ev105',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite de l'extension Foudre Noir Flamme Blanche EV105.",
      images: [
        {
          url: '/img/products/etb-foudre-noir-flamme-blanche-ev105.jpg',
          altText: 'ETB Foudre Noir Flamme Blanche EV105',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Foudre Noir Flamme Blanche',
          language: 'Français',
          edition: 'EV105',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-EV105-FR',
        },
      ],
    },
    {
      name: 'ETB Méga-Évolution Gardevoir',
      slug: 'etb-mega-evolution-gardevoir',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite Méga-Évolution avec Gardevoir.",
      images: [
        {
          url: '/img/products/ETB-MegaEvolution-Gardevoir.jpg',
          altText: 'ETB Méga-Évolution Gardevoir',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Méga-Évolution Gardevoir',
          language: 'Français',
          edition: 'Méga-Évolution',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-MEGA-GARDEVOIR',
        },
      ],
    },
    {
      name: 'Méga-Évolution Héros Transcendants Elite Trainer Box',
      slug: 'mega-evolution-heros-transcendants-etb',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite Méga-Évolution Héros Transcendants.",
      images: [
        {
          url: '/img/products/Mega_Evolution—Heros_Transcendants_Elite_Trainer_Box_FR.webp',
          altText: 'Méga-Évolution Héros Transcendants Elite Trainer Box',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Méga-Évolution Héros Transcendants',
          language: 'Français',
          edition: 'Méga-Évolution',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-MEGA-HEROS',
        },
      ],
    },
    {
      name: 'Pokémon ETB Flammes Blanches',
      slug: 'pokemon-etb-flammes-blanches',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite Flammes Blanches.",
      images: [
        {
          url: '/img/products/Pokemon-ETB-flammes-blanches.jpg',
          altText: 'Pokémon ETB Flammes Blanches',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Flammes Blanches',
          language: 'Français',
          edition: 'Flammes Blanches',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-FLAMMES-BLANCHES',
        },
      ],
    },
    {
      name: 'Pokémon ETB Flammes Fantasmagoriques ME02',
      slug: 'pokemon-etb-flammes-fantasmagoriques-me02',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite Flammes Fantasmagoriques ME02",
      images: [
        {
          url: '/img/products/Pokemon-ETB-Flammes-Fantasmagoriques-ME02-Coffret-Dresseur-dElite-en-francais.jpg',
          altText: 'Pokémon ETB Flammes Fantasmagoriques ME02',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Flammes Fantasmagoriques ME02',
          language: 'Français',
          edition: 'ME02',
          priceCents: 5499,
          stock: 0,
          sku: 'ME02-ETB',
        },
      ],
    },
    {
      name: 'Pokémon TCG Méga-Évolution Elite Trainer Box Lucario',
      slug: 'pokemon-tcg-mega-evolution-elite-trainer-box-lucario',
      category: 'Pokémon',
      description: "Coffret Dresseur d'Élite Méga-Évolution avec Lucario.",
      images: [
        {
          url: '/img/products/Pokemon-TCG-Mega-Evolution-Elite-Trainer-Box-Lucario-ETB-Booster-EAN-GTIN-0196214129160.jpg',
          altText: 'Pokémon TCG Méga-Évolution Elite Trainer Box Lucario',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'ETB Méga-Évolution Lucario',
          language: 'Français',
          edition: 'Méga-Évolution',
          priceCents: 5499,
          stock: 0,
          sku: 'ETB-MEGA-LUCARIO',
        },
      ],
    },
    {
      name: 'UPC Flammes Fantasmagoriques',
      slug: 'upc-flammes-fantasmagorique',
      category: 'Pokémon',
      description: 'Ultra Premium Collection Flammes Fantasmagoriques.',
      images: [
        {
          url: '/img/products/UPC-Flammes-Fantasmagorique.png',
          altText: 'UPC Flammes Fantasmagoriques',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'UPC Flammes Fantasmagoriques',
          language: 'Français',
          edition: 'ME02',
          priceCents: 12999,
          stock: 0,
          sku: 'UPC-ME02-FLAMMES',
        },
      ],
    },
    // === ONE PIECE ===
    {
      name: 'Display One Piece OP09',
      slug: 'display-one-piece-op09',
      category: 'One Piece',
      description: "Display de 24 boosters de l'extension One Piece OP09.",
      images: [
        { url: '/img/products/Display-OP09.png', altText: 'Display One Piece OP09', position: 0 },
      ],
      variants: [
        {
          name: 'Display One Piece OP09',
          language: 'Français',
          edition: 'OP09',
          priceCents: 13200,
          stock: 0,
          sku: 'DIS-OP09-FR',
        },
      ],
    },
    {
      name: 'Display One Piece OP11',
      slug: 'display-one-piece-op11',
      category: 'One Piece',
      description: "Display de 24 boosters de l'extension One Piece OP11.",
      images: [
        { url: '/img/products/Display-OP11.png', altText: 'Display One Piece OP11', position: 0 },
      ],
      variants: [
        {
          name: 'Display One Piece OP11',
          language: 'Français',
          edition: 'OP11',
          priceCents: 13200,
          stock: 0,
          sku: 'DIS-OP11-FR',
        },
      ],
    },
    {
      name: 'Display One Piece OP12',
      slug: 'display-one-piece-op12',
      category: 'One Piece',
      description: "Display de 24 boosters de l'extension One Piece OP12.",
      images: [
        { url: '/img/products/Display-OP12.png', altText: 'Display One Piece OP12', position: 0 },
      ],
      variants: [
        {
          name: 'Display One Piece OP12',
          language: 'Français',
          edition: 'OP12',
          priceCents: 13200,
          stock: 0,
          sku: 'DIS-OP12-FR',
        },
      ],
    },
    {
      name: 'Display One Piece OP13',
      slug: 'display-one-piece-op13',
      category: 'One Piece',
      description: "Display de 24 boosters de l'extension One Piece OP13.",
      images: [
        { url: '/img/products/Display-OP13.png', altText: 'Display One Piece OP13', position: 0 },
      ],
      variants: [
        {
          name: 'Display One Piece OP13',
          language: 'Français',
          edition: 'OP13',
          priceCents: 15900,
          stock: 10,
          sku: 'DIS-OP13-FR',
        },
      ],
    },
    // === ACCESSOIRES ===
    {
      name: 'Protection Acrylique ETB',
      slug: 'protection-acrylique-etb',
      category: 'Accessoires',
      description: 'Protection acrylique transparente pour Elite Trainer Box.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Protection Acrylique ETB', position: 0 },
      ],
      variants: [
        {
          name: 'Protection Acrylique ETB Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 1999,
          stock: 0,
          sku: 'PROT-ACRYL-ETB-STD',
        },
      ],
    },
    {
      name: 'Protection Acrylique UPC',
      slug: 'protection-acrylique-upc',
      category: 'Accessoires',
      description: 'Protection acrylique transparente pour Ultra Premium Collection.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Protection Acrylique UPC', position: 0 },
      ],
      variants: [
        {
          name: 'Protection Acrylique UPC Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 2499,
          stock: 0,
          sku: 'PROT-ACRYL-UPC-STD',
        },
      ],
    },
    {
      name: 'Card Saver Premium',
      slug: 'card-saver-premium',
      category: 'Accessoires',
      description: 'Card saver de qualité premium pour protéger vos cartes individuelles.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Card Saver Premium', position: 0 },
      ],
      variants: [
        {
          name: 'Card Saver Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 599,
          stock: 0,
          sku: 'CARD-SAVER-STD',
        },
        {
          name: 'Card Saver Premium',
          language: 'Français',
          edition: 'Premium',
          priceCents: 999,
          stock: 0,
          sku: 'CARD-SAVER-PREM',
        },
      ],
    },
    {
      name: 'Classeur TCG Premium',
      slug: 'classeur-tcg-premium',
      category: 'Accessoires',
      description:
        'Classeur premium avec pages protectrices pour organiser et protéger votre collection.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Classeur TCG Premium', position: 0 },
      ],
      variants: [
        {
          name: 'Classeur 360 cartes',
          language: 'Français',
          edition: '360 cartes',
          priceCents: 2499,
          stock: 0,
          sku: 'CLASS-TCG-360',
        },
        {
          name: 'Classeur 480 cartes',
          language: 'Français',
          edition: '480 cartes',
          priceCents: 2999,
          stock: 0,
          sku: 'CLASS-TCG-480',
        },
      ],
    },
    {
      name: 'Sleeves Premium',
      slug: 'sleeves-premium',
      category: 'Accessoires',
      description: 'Sleeves de protection premium pour vos cartes.',
      images: [{ url: '/img/products/placeholder.png', altText: 'Sleeves Premium', position: 0 }],
      variants: [
        {
          name: 'Sleeves Standard (100 unités)',
          language: 'Français',
          edition: 'Standard',
          priceCents: 999,
          stock: 0,
          sku: 'SLEEVES-STD-100',
        },
        {
          name: 'Sleeves Premium (100 unités)',
          language: 'Français',
          edition: 'Premium',
          priceCents: 1499,
          stock: 0,
          sku: 'SLEEVES-PREM-100',
        },
      ],
    },
    {
      name: 'Toploader Premium',
      slug: 'toploader-premium',
      category: 'Accessoires',
      description: 'Toploader rigide pour protéger vos cartes les plus précieuses.',
      images: [{ url: '/img/products/placeholder.png', altText: 'Toploader Premium', position: 0 }],
      variants: [
        {
          name: 'Toploader Standard',
          language: 'Français',
          edition: 'Standard',
          priceCents: 599,
          stock: 0,
          sku: 'TOPLOADER-STD',
        },
        {
          name: 'Toploader Premium',
          language: 'Français',
          edition: 'Premium',
          priceCents: 799,
          stock: 0,
          sku: 'TOPLOADER-PREM',
        },
      ],
    },
    {
      name: 'Boîte de Stockage TCG',
      slug: 'boite-stockage-tcg',
      category: 'Accessoires',
      description: 'Boîte de stockage robuste pour organiser et protéger vos cartes.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Boîte de Stockage TCG', position: 0 },
      ],
      variants: [
        {
          name: 'Boîte 800 cartes',
          language: 'Français',
          edition: '800 cartes',
          priceCents: 1499,
          stock: 0,
          sku: 'BOITE-TCG-800',
        },
        {
          name: 'Boîte 1600 cartes',
          language: 'Français',
          edition: '1600 cartes',
          priceCents: 1999,
          stock: 0,
          sku: 'BOITE-TCG-1600',
        },
      ],
    },
    {
      name: 'Pages Protectrices Binder',
      slug: 'pages-protectrices-binder',
      category: 'Accessoires',
      description: 'Pages protectrices pour classeur.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Pages Protectrices Binder', position: 0 },
      ],
      variants: [
        {
          name: 'Pages 9 emplacements',
          language: 'Français',
          edition: '9 emplacements',
          priceCents: 499,
          stock: 0,
          sku: 'PAGES-BINDER-9',
        },
        {
          name: 'Pages 12 emplacements',
          language: 'Français',
          edition: '12 emplacements',
          priceCents: 599,
          stock: 0,
          sku: 'PAGES-BINDER-12',
        },
      ],
    },
    // === MAGIC ===
    {
      name: 'Booster Magic: The Gathering',
      slug: 'booster-magic-the-gathering',
      category: 'Magic',
      description: 'Booster de 15 cartes Magic: The Gathering.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Booster Magic: The Gathering',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'Booster Magic Standard',
          language: 'Anglais',
          edition: 'Standard',
          priceCents: 550,
          stock: 0,
          sku: 'BOOST-MTG-STD',
        },
      ],
    },
    {
      name: 'Display Magic: The Gathering',
      slug: 'display-magic-the-gathering',
      category: 'Magic',
      description: 'Display de 36 boosters Magic: The Gathering.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Display Magic: The Gathering',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'Display Magic Standard',
          language: 'Anglais',
          edition: 'Standard',
          priceCents: 19800,
          stock: 0,
          sku: 'DIS-MTG-STD',
        },
      ],
    },
    {
      name: 'Booster Box Magic: The Gathering',
      slug: 'booster-box-magic-the-gathering',
      category: 'Magic',
      description: 'Booster Box Magic: The Gathering contenant 36 boosters.',
      images: [
        {
          url: '/img/products/placeholder.png',
          altText: 'Booster Box Magic: The Gathering',
          position: 0,
        },
      ],
      variants: [
        {
          name: 'Booster Box Magic Standard',
          language: 'Anglais',
          edition: 'Standard',
          priceCents: 18900,
          stock: 0,
          sku: 'BOX-MTG-STD',
        },
      ],
    },
    // === RIFTBOUND ===
    {
      name: 'Booster Riftbound',
      slug: 'booster-riftbound',
      category: 'Riftbound',
      description: 'Booster de cartes Riftbound.',
      images: [{ url: '/img/products/placeholder.png', altText: 'Booster Riftbound', position: 0 }],
      variants: [
        {
          name: 'Booster Riftbound',
          language: 'Anglais',
          edition: 'Base Set',
          priceCents: 550,
          stock: 0,
          sku: 'BOOST-RIFT-BASE',
        },
      ],
    },
    {
      name: 'Display Riftbound',
      slug: 'display-riftbound',
      category: 'Riftbound',
      description: 'Display de 24 boosters Riftbound.',
      images: [{ url: '/img/products/placeholder.png', altText: 'Display Riftbound', position: 0 }],
      variants: [
        {
          name: 'Display Riftbound',
          language: 'Anglais',
          edition: 'Base Set',
          priceCents: 13200,
          stock: 0,
          sku: 'DIS-RIFT-BASE',
        },
      ],
    },
    {
      name: 'Booster Box Riftbound',
      slug: 'booster-box-riftbound',
      category: 'Riftbound',
      description: 'Booster Box Riftbound contenant 36 boosters.',
      images: [
        { url: '/img/products/placeholder.png', altText: 'Booster Box Riftbound', position: 0 },
      ],
      variants: [
        {
          name: 'Booster Box Riftbound',
          language: 'Anglais',
          edition: 'Base Set',
          priceCents: 18900,
          stock: 0,
          sku: 'BOX-RIFT-BASE',
        },
      ],
    },
  ];

  let createdCount = 0;
  let errorCount = 0;

  for (const product of productsData) {
    try {
      await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug,
          category: product.category,
          description: product.description,
          images: { create: product.images },
          variants: { create: product.variants },
        },
      });
      console.log(`✅ Produit créé: ${product.name}`);
      createdCount++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠️  Produit déjà existant: ${product.name}`);
        try {
          await prisma.product.update({
            where: { slug: product.slug },
            data: {
              name: product.name,
              category: product.category,
              description: product.description,
              images: { deleteMany: {}, create: product.images },
              variants: { deleteMany: {}, create: product.variants },
            },
          });
          console.log(`✅ Produit mis à jour: ${product.name}`);
          createdCount++;
        } catch (updateError: any) {
          console.error(`❌ Erreur mise à jour ${product.name}:`, updateError.message);
          errorCount++;
        }
      } else {
        console.error(`❌ Erreur création ${product.name}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log(`🛒 Seeding terminé: ${createdCount} produits, ${errorCount} erreurs`);
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Début du seeding...');
  console.log('📋 Configuration:');
  console.log(`   - Admin email: ${ADMIN_EMAIL}`);
  console.log(`   - Admin username: ${ADMIN_USERNAME}`);
  console.log(`   - Test users: ${CREATE_TEST_USERS ? 'activés' : 'désactivés'}`);
  console.log('');

  // Valider la configuration avant de commencer
  validateSeedConfig();

  await upsertAdminUsers();
  await upsertTestUsers();
  await seedProducts();

  console.log('');
  console.log('✅ Seeding terminé avec succès!');
  console.log("🔐 Les credentials sont définis via les variables d'environnement");
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
