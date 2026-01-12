import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
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
import reservationRoutes from './routes/reservations.js';

// Import des middlewares de sécurité
import {
  helmetConfig,
  corsOptions,
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

  // Webhook Stripe - DOIT être défini AVANT le middleware CORS (pas d'origin header - server-to-server)
  // Les webhooks Stripe sont authentifiés par signature, pas par CORS
  app.post(
    '/api/checkout/webhook',
    express.raw({ type: 'application/json' }),
    checkoutWebhookHandler
  );

  // Middleware CORS sécurisé (appliqué après le webhook)
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

        // En production, bloquer !origin (les webhooks sont gérés avant ce middleware)
        if (!origin) {
          console.warn('🚫 CORS: Requête sans origin header en production - bloquée');
          return callback(new Error('CORS: Origin header requis en production'));
        }

        // En production, vérifier strictement les origines autorisées
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`🚫 CORS bloqué pour l'origine: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Cart-Id'],
      optionsSuccessStatus: 200,
    })
  );

  // Middleware de debug CORS (uniquement en développement)
  if (isDevelopment) {
    app.use((req, res, next) => {
      console.log(`🌐 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
      next();
    });
  }

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
  // Note: Le webhook Stripe est défini AVANT le middleware CORS (voir plus haut)

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

  // Routes des réservations de panier
  app.use('/api/reservations', reservationRoutes);

  // Gestion des erreurs globales
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const isTest = process.env.NODE_ENV === 'test';
    let statusCode = (err as any).statusCode || (err as any).status || 500;
    let errorCode = (err as any).code || 'INTERNAL_SERVER_ERROR';
    let errorDetails: any = undefined;

    // 1) Zod / Validation errors
    if (err.name === 'ZodError' || (err as any).issues) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorDetails = (err as any).issues || (err as any).errors;
    } else if ((err as any).isJoi || (err as any).details) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      errorDetails = (err as any).details;
    }
    // 2) JWT errors
    else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      statusCode = 401;
      errorCode = 'INVALID_TOKEN';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
    }
    // 3) Prisma errors - Vérification robuste par code d'erreur
    else if (
      (err as any).code &&
      typeof (err as any).code === 'string' &&
      (err as any).code.startsWith('P')
    ) {
      const prismaError = err as any;
      if (prismaError.code === 'P2002') {
        // Unique constraint violation
        statusCode = 409;
        const target = prismaError.meta?.target || [];
        if (Array.isArray(target) && target.includes('email')) {
          errorCode = 'EMAIL_ALREADY_EXISTS';
        } else if (Array.isArray(target) && target.includes('username')) {
          errorCode = 'USERNAME_ALREADY_EXISTS';
        } else {
          errorCode = 'DUPLICATE';
        }
      } else if (prismaError.code === 'P2025') {
        // Record not found
        statusCode = 404;
        errorCode = 'NOT_FOUND';
      } else if (prismaError.code === 'P2003') {
        // Foreign key constraint violation
        statusCode = 400;
        errorCode = 'INVALID_REFERENCE';
      }
    } else if (err.name === 'PrismaClientValidationError') {
      statusCode = 400;
      errorCode = 'INVALID_INPUT';
    }
    // 4) Erreurs applicatives custom (si statusCode/status existe, utiliser tel quel)
    else if ((err as any).statusCode || (err as any).status) {
      statusCode = (err as any).statusCode || (err as any).status;
      errorCode = (err as any).code || errorCode;
    }
    // 5) Mapping par code d'erreur connu
    else {
      const errorCodeToStatus: Record<string, number> = {
        // Validation
        VALIDATION_ERROR: 400,
        INVALID_INPUT: 400,

        // Authentification
        INVALID_CREDENTIALS: 401,
        INVALID_TOKEN: 401,
        TOKEN_EXPIRED: 401,
        ACCESS_TOKEN_REQUIRED: 401,
        AUTHENTICATION_REQUIRED: 401,
        INVALID_2FA_CODE: 401,
        STRIPE_NOT_CONFIGURED: 401,

        // Autorisation
        ADMIN_ACCESS_REQUIRED: 403,
        UNAUTHORIZED_ACCESS: 403,
        FORBIDDEN: 403,

        // Conflits
        OUT_OF_STOCK: 409,
        HOLD_EXPIRED: 409,
        EMAIL_ALREADY_EXISTS: 409,
        USERNAME_ALREADY_EXISTS: 409,
        DUPLICATE_ITEMS: 409,
        DUPLICATE: 409,
      };

      if (errorCodeToStatus[errorCode]) {
        statusCode = errorCodeToStatus[errorCode];
      }
    }

    // Logger les erreurs (500 en prod, toutes en test)
    if (statusCode === 500) {
      console.error('Erreur serveur non gérée:', {
        message: err.message,
        code: errorCode,
        name: err.name,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
      });
    } else if (isTest) {
      // En test, logger toutes les erreurs pour débogage
      console.error('Erreur mappée en test:', {
        message: err.message,
        code: errorCode,
        statusCode,
        name: err.name,
        url: req.originalUrl,
        method: req.method,
      });
    }

    const response: any = {
      error: isTest ? err.message : statusCode === 500 ? 'Erreur interne du serveur' : err.message,
      code: errorCode,
    };

    if (errorDetails) {
      response.details = errorDetails;
    }

    if (isTest && statusCode === 500) {
      response.stack = err.stack;
      response.details = err;
    }

    res.status(statusCode).json(response);
  });

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
