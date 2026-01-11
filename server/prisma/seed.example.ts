/**
 * ============================================================================
 * SEED EXAMPLE - Template de configuration
 * ============================================================================
 *
 * Ce fichier montre la structure du seed sans contenir de données sensibles.
 *
 * Pour utiliser le seed :
 *
 * 1. Copier les variables suivantes dans votre fichier .env :
 *
 *    # Configuration du seed (OBLIGATOIRE)
 *    SEED_ADMIN_EMAIL=admin@votredomaine.com
 *    SEED_ADMIN_PASSWORD=VotreMotDePasseSecurise123!
 *    SEED_ADMIN_USERNAME=admin
 *    SEED_ADMIN_FIRST_NAME=Admin
 *    SEED_ADMIN_LAST_NAME=User
 *
 *    # Utilisateurs de test (OPTIONNEL - dev uniquement)
 *    SEED_CREATE_TEST_USERS=true
 *    SEED_TEST_PASSWORD=TestPassword123!
 *
 * 2. Exécuter le seed :
 *    npx prisma db seed
 *
 * ============================================================================
 * SÉCURITÉ
 * ============================================================================
 *
 * - NE JAMAIS commiter de mots de passe dans le code source
 * - NE JAMAIS utiliser les mêmes credentials en dev et en prod
 * - Utiliser un mot de passe fort (min 12 caractères, mixte)
 * - Les utilisateurs de test sont désactivés par défaut
 *
 * ============================================================================
 */

// Variables d'environnement requises (voir .env.example)
const REQUIRED_ENV_VARS = ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'SEED_ADMIN_USERNAME'];

// Variables d'environnement optionnelles
const OPTIONAL_ENV_VARS = [
  'SEED_ADMIN_FIRST_NAME',
  'SEED_ADMIN_LAST_NAME',
  'SEED_CREATE_TEST_USERS',
  'SEED_TEST_PASSWORD',
];

// Structure des données de seed (sans valeurs sensibles)
const SEED_STRUCTURE = {
  admin: {
    email: 'process.env.SEED_ADMIN_EMAIL',
    password: 'process.env.SEED_ADMIN_PASSWORD (hashé avec bcrypt)',
    username: 'process.env.SEED_ADMIN_USERNAME',
    isAdmin: true,
    isVerified: true,
  },
  testUsers: {
    enabled: 'process.env.SEED_CREATE_TEST_USERS === "true"',
    password: 'process.env.SEED_TEST_PASSWORD (hashé avec bcrypt)',
  },
  products: [
    {
      name: 'Nom du produit',
      slug: 'slug-unique',
      category: 'Catégorie',
      description: 'Description du produit',
      images: [{ url: '/path/to/image.jpg', altText: 'Description', position: 0 }],
      variants: [{ name: 'Variante', priceCents: 1000, stock: 0, sku: 'SKU-001' }],
    },
  ],
};

console.log('📋 Structure du seed:', JSON.stringify(SEED_STRUCTURE, null, 2));
console.log('');
console.log('🔧 Variables requises:', REQUIRED_ENV_VARS);
console.log('🔧 Variables optionnelles:', OPTIONAL_ENV_VARS);
