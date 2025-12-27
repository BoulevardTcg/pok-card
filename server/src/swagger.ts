import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BoulevardTCG API',
      version: '1.0.0',
      description:
        'API pour la boutique en ligne BoulevardTCG - Cartes à collectionner Pokémon et One Piece',
      contact: {
        name: 'Support',
        email: 'support@boulevardtcg.fr',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Serveur de développement',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des sessions' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Products', description: 'Catalogue de produits' },
      { name: 'Checkout', description: 'Panier et paiement' },
      { name: '2FA', description: 'Authentification à deux facteurs' },
      { name: 'Admin', description: 'Administration (réservé aux admins)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu lors de la connexion',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: "Message d'erreur" },
            code: { type: 'string', description: "Code d'erreur" },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatar: { type: 'string' },
            isAdmin: { type: 'boolean' },
            twoFactorEnabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            images: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  url: { type: 'string' },
                  altText: { type: 'string' },
                },
              },
            },
            variants: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProductVariant' },
            },
          },
        },
        ProductVariant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            language: { type: 'string' },
            edition: { type: 'string' },
            priceCents: { type: 'integer' },
            stock: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderNumber: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            },
            totalCents: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            productName: { type: 'string' },
            quantity: { type: 'integer' },
            unitPriceCents: { type: 'integer' },
          },
        },
      },
    },
  },
  apis: [], // Nous utilisons la définition inline ci-dessous
};

// Définition des paths de l'API
const apiPaths = {
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Inscription',
        description: 'Créer un nouveau compte utilisateur',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 3 },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Compte créé avec succès' },
          '400': { description: 'Données invalides' },
          '409': { description: 'Email ou username déjà utilisé' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion',
        description: 'Se connecter avec email et mot de passe',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Connexion réussie',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          '401': { description: 'Identifiants invalides' },
          '429': { description: 'Trop de tentatives' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Liste des produits',
        description: 'Récupérer tous les produits avec pagination et filtres',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Liste des produits',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: "Détails d'un produit",
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Détails du produit',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          '404': { description: 'Produit non trouvé' },
        },
      },
    },
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Profil utilisateur',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: "Profil de l'utilisateur",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/api/2fa/setup': {
      post: {
        tags: ['2FA'],
        summary: 'Configurer 2FA',
        description:
          "Génère un secret et QR code pour configurer l'authentification à deux facteurs",
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Secret et QR code générés',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    secret: { type: 'string' },
                    qrCode: { type: 'string', description: 'QR code en base64' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/2fa/enable': {
      post: {
        tags: ['2FA'],
        summary: 'Activer 2FA',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', description: 'Code TOTP à 6 chiffres' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: '2FA activé' },
          '400': { description: 'Code invalide' },
        },
      },
    },
    '/api/2fa/disable': {
      post: {
        tags: ['2FA'],
        summary: 'Désactiver 2FA',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'password'],
                properties: {
                  code: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: '2FA désactivé' },
        },
      },
    },
    '/api/checkout/create-session': {
      post: {
        tags: ['Checkout'],
        summary: 'Créer une session de paiement',
        description: 'Crée une session Stripe Checkout pour le paiement',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        variantId: { type: 'string' },
                        quantity: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Session créée',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessionId: { type: 'string' },
                    url: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Vérification de santé',
        responses: {
          '200': { description: 'Serveur en bonne santé' },
        },
      },
    },
  },
};

// Fusionner les options avec les paths
const swaggerSpec = {
  ...swaggerJsdoc(options),
  ...apiPaths,
};

export function setupSwagger(app: Express) {
  // Servir la documentation Swagger
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'BoulevardTCG API Documentation',
    })
  );

  // Endpoint pour le spec JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export default swaggerSpec;
