import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import des routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import checkoutRoutes, { checkoutWebhookHandler } from './routes/checkout.js';
import reviewsRoutes from './routes/reviews.js';
import promoRoutes from './routes/promo.js';
import collectionRoutes from './routes/collection.js';
import tradeOffersRoutes from './routes/trade-offers.js';
import adminRoutes from './routes/admin.js';
import orderRoutes from './routes/orders.js';
import contactRoutes from './routes/contact.js';
import gdprRoutes from './routes/gdpr.js';

// Import des middlewares de sécurité
import {
  helmetConfig,
  apiLimiter,
  validateInput,
  sanitizeInput,
  secureLogging,
  injectionProtection,
} from './middleware/security.js';

export const createApp = () => {
  const app = express();

  // Configuration CORS sécurisée
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || [
    'http://localhost:5173',
  ];
  const isDevelopment = process.env.NODE_ENV === 'development';

  app.use(
    cors({
      origin: (origin, callback) => {
        // En développement, permettre localhost et les origines configurées
        if (
          isDevelopment &&
          (!origin || origin.includes('localhost') || origin.includes('127.0.0.1'))
        ) {
          return callback(null, true);
        }
        // En production, vérifier strictement les origines autorisées
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
      optionsSuccessStatus: 200,
    })
  );

  // Middlewares de sécurité
  app.use(helmetConfig);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(validateInput);
  app.use(sanitizeInput);
  app.use(injectionProtection);
  app.use(secureLogging);

  // Rate limiting global
  app.use('/api', apiLimiter);

  // Routes d'authentification
  app.use('/api/auth', authRoutes);

  // Routes des utilisateurs
  app.use('/api/users', userRoutes);

  // Routes des produits
  app.use('/api/products', productRoutes);

  // Routes de checkout
  app.use('/api/checkout', checkoutRoutes);
  app.post(
    '/api/checkout/webhook',
    express.raw({ type: 'application/json' }),
    checkoutWebhookHandler
  );

  // Routes des avis
  app.use('/api/reviews', reviewsRoutes);

  // Routes des codes promo
  app.use('/api/promo', promoRoutes);

  // Routes de collection
  app.use('/api/collection', collectionRoutes);

  // Routes d'échange
  app.use('/api/trade-offers', tradeOffersRoutes);

  // Routes d'administration
  app.use('/api/admin', adminRoutes);

  // Routes de suivi commande
  app.use('/api/orders', orderRoutes);

  // Contact (formulaire)
  app.use('/api/contact', contactRoutes);

  // Routes RGPD (protection des données)
  app.use('/api/gdpr', gdprRoutes);

  // Gestion des erreurs globales
  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({
        error: 'Erreur interne du serveur',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  );

  // Gestion des routes non trouvées
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route non trouvée',
      code: 'ROUTE_NOT_FOUND',
      path: req.originalUrl,
    });
  });

  return app;
};
