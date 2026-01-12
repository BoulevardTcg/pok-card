import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import twoFactorRoutes from './routes/twoFactor.js';
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

// Import du logger
import logger, { requestLoggerMiddleware } from './utils/logger.js';

// Import Swagger pour la documentation API
import { setupSwagger } from './swagger.js';
import { validateEnvOrThrow } from './config/validateEnv.js';

// Import du service de réservation pour le nettoyage automatique
import { cleanupExpired } from './services/reservationService.js';

const app = express();

// Trust proxy - nécessaire pour Railway/Heroku/etc. (derrière un load balancer)
// Permet à express-rate-limit de fonctionner correctement avec X-Forwarded-For
app.set('trust proxy', 1);

// Fail-fast env (prod) / warn (dev)
validateEnvOrThrow();

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

// Servir les fichiers uploadés (images produits)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Middlewares de sécurité
app.use(helmetConfig);
app.use(express.json({ limit: '1mb' })); // Limite la taille des requêtes
app.use(requestLoggerMiddleware); // Logging structuré
app.use(secureLogging);
app.use(validateInput);
app.use(sanitizeInput);
app.use(injectionProtection);

// Rate limiting global (exclure le webhook Stripe)
app.use('/api/', (req, res, next) => {
  // Exempter le webhook Stripe du rate limiting
  if (req.path === '/checkout/webhook') {
    return next();
  }
  apiLimiter(req, res, next);
});

// Configuration du cache
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);
type CacheEntry = { time: number; data: any };
const cache = new Map<string, CacheEntry>();

const getCache = (key: string) => {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return e.data;
};

const setCache = (key: string, data: any) => cache.set(key, { time: Date.now(), data });

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Routes des utilisateurs
app.use('/api/users', userRoutes);

// Routes produits
app.use('/api/products', productRoutes);

// Checkout Stripe
app.use('/api/checkout', checkoutRoutes);

// Avis produits
app.use('/api/reviews', reviewsRoutes);

// Codes promo
app.use('/api/promo', promoRoutes);

// Collection utilisateur
app.use('/api/collection', collectionRoutes);

// Offres d'échange
app.use('/api/trade-offers', tradeOffersRoutes);

// Routes d'administration
app.use('/api/admin', adminRoutes);

// Routes 2FA (Two-Factor Authentication)
app.use('/api/2fa', twoFactorRoutes);

// Routes RGPD (protection des données personnelles)
app.use('/api/gdpr', gdprRoutes);

// Contact (formulaire)
app.use('/api/contact', contactRoutes);

// Routes des réservations de panier
app.use('/api/reservations', reservationRoutes);

// Route de santé
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Documentation API Swagger
setupSwagger(app);

// Fonction pour récupérer les données depuis l'API REST de TCGdx
const fetchTCGdx = async (endpoint: string) => {
  const response = await fetch(`https://api.tcgdex.net/v2/fr/${endpoint}`);
  if (!response.ok) return null;
  return response.json();
};

// Route pour récupérer les séries de cartes
app.get('/api/trade/sets', validateInput, async (_req, res) => {
  const key = 'sets:fr';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const data = await fetchTCGdx('sets');
    if (!data || !Array.isArray(data)) {
      res.json([]);
      return;
    }

    const mapped = data.map((s: any) => ({
      id: s.id,
      name: s.name,
      series: s.serie?.name ?? null,
      printedTotal: s.cardCount?.official ?? null,
      total: s.cardCount?.total ?? null,
      releaseDate: s.releaseDate ?? null,
      imagesLogo: s.logo || null,
      imagesSymbol: s.symbol || null,
    }));

    // Filtrer les séries qui n'ont ni logo ni symbole
    const filteredSets = mapped.filter((set: any) => {
      const hasLogo = set.imagesLogo && set.imagesLogo.trim() !== '' && set.imagesLogo !== 'null';
      const hasSymbol =
        set.imagesSymbol && set.imagesSymbol.trim() !== '' && set.imagesSymbol !== 'null';

      // Vérifier que l'URL n'est pas juste "null" ou vide
      const isValidLogo = hasLogo && !set.imagesLogo.includes('null');
      const isValidSymbol = hasSymbol && !set.imagesSymbol.includes('null');

      return isValidLogo || isValidSymbol;
    });

    console.log(`📊 Séries trouvées: ${mapped.length}, Séries avec images: ${filteredSets.length}`);

    // Log des séries filtrées pour debug
    if (filteredSets.length < mapped.length) {
      const removedSets = mapped.filter((set: any) => {
        const hasLogo = set.imagesLogo && set.imagesLogo.trim() !== '' && set.imagesLogo !== 'null';
        const hasSymbol =
          set.imagesSymbol && set.imagesSymbol.trim() !== '' && set.imagesSymbol !== 'null';
        return !hasLogo && !hasSymbol;
      });
      console.log(
        `🚫 Séries supprimées (pas d'images):`,
        removedSets.map((s: any) => s.name)
      );
    }

    setCache(key, filteredSets);
    res.json(filteredSets);
  } catch (e) {
    console.error('Error fetching sets:', e);
    res.json([]);
  }
});

// Route pour récupérer les cartes d'une série
app.get('/api/trade/sets/:id/cards', validateInput, async (req, res) => {
  const { id } = req.params;
  const key = `set:${id}:fr`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    // Récupère le set avec ses cartes
    const set = await fetchTCGdx(`sets/${id}`);
    if (
      !set ||
      typeof set !== 'object' ||
      !('cards' in set) ||
      !Array.isArray((set as any).cards)
    ) {
      res.json([]);
      return;
    }

    const setReleaseDate: string | null = (set as any).releaseDate ?? null;
    const setSeries: string | null = (set as any).serie?.name ?? null;

    const cards = await Promise.all(
      ((set as any).cards || []).map(async (cardResume: any) => {
        // Récupère la carte complète
        const card = await fetchTCGdx(`cards/${cardResume.id}`);
        if (!card || typeof card !== 'object') {
          return null;
        }

        // Utilise la propriété image de l'objet carte selon la documentation TCGdex
        const baseImageUrl = (card as any).image || null;
        const highQualityPng = baseImageUrl ? `${baseImageUrl}/high.png` : null;
        const lowQualityWebp = baseImageUrl ? `${baseImageUrl}/low.webp` : null;

        // Debug: afficher les URLs d'images (seulement en développement)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Carte ${(card as any).name}:`, {
            baseImageUrl,
            highQualityPng,
            lowQualityWebp,
          });
        }

        return {
          id: (card as any).id,
          name: (card as any).name,
          number: String((card as any).localId),
          rarity: (card as any).rarity ?? null,
          imagesSmall: lowQualityWebp,
          imagesLarge: highQualityPng,
          setReleaseDate,
          setSeries,
          // Ajouter aussi l'URL de base pour debug
          image: baseImageUrl,
        };
      })
    );

    const filteredCards = cards.filter((card: any) => card !== null);

    const rarityOrderFr: Record<string, number> = {
      Commune: 1,
      'Peu commune': 2,
      Rare: 3,
      'Rare Holographique': 4,
      'Double rare': 5,
      'Ultra rare': 6,
      'Rare Illustration': 7,
      'Rare Illustration spéciale': 8,
      'Hyper rare': 9,
      'Rare secrète': 10,
      'Rare arc-en-ciel': 10,
      Promo: 0,
    };

    filteredCards.sort(
      (a: any, b: any) =>
        (rarityOrderFr[a.rarity ?? ''] ?? 0) - (rarityOrderFr[b.rarity ?? ''] ?? 0) ||
        String(a.number).localeCompare(String(b.number))
    );

    setCache(key, filteredCards);
    res.json(filteredCards);
  } catch (e) {
    console.error(`Error fetching cards for set ${id}:`, e);
    res.json([]);
  }
});

// Gestion des erreurs globales
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur globale:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
  });
});

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  logger.info(`🚀 Serveur démarré sur http://${host}:${port}`);
  logger.info(`📚 API d'authentification: http://${host}:${port}/api/auth`);
  logger.info(`👤 API utilisateurs: http://${host}:${port}/api/users`);
  logger.info(`🛒 API produits: http://${host}:${port}/api/products`);
  logger.info(`💳 API checkout: http://${host}:${port}/api/checkout`);
  logger.info(`⭐ API avis: http://${host}:${port}/api/reviews`);
  logger.info(`🎟️ API codes promo: http://${host}:${port}/api/promo`);
  logger.info(`📦 API collection: http://${host}:${port}/api/collection`);
  logger.info(`🔄 API offres d'échange: http://${host}:${port}/api/trade-offers`);
  logger.info(`🃏 API trade: http://${host}:${port}/api/trade`);
  logger.info(`🔐 API 2FA: http://${host}:${port}/api/2fa`);
  logger.info(`📨 API contact: http://${host}:${port}/api/contact`);
  logger.info(`💚 Santé: http://${host}:${port}/api/health`);
  logger.info(`📖 Documentation API: http://${host}:${port}/api-docs`);

  // Job de nettoyage automatique des réservations expirées
  // Nettoie toutes les 60 secondes (1 minute)
  const CLEANUP_INTERVAL_MS = 60 * 1000;

  // Exécuter un premier nettoyage après 30 secondes (pour éviter de surcharger au démarrage)
  setTimeout(async () => {
    try {
      const count = await cleanupExpired();
      if (count > 0) {
        logger.info(`🧹 Nettoyage initial: ${count} réservation(s) expirée(s) supprimée(s)`);
      }
    } catch (error) {
      logger.error('Erreur lors du nettoyage initial des réservations:', error);
    }
  }, 30 * 1000);

  // Puis nettoyer toutes les minutes
  setInterval(async () => {
    try {
      const count = await cleanupExpired();
      if (count > 0) {
        logger.info(`🧹 Nettoyage automatique: ${count} réservation(s) expirée(s) supprimée(s)`);
      }
    } catch (error) {
      logger.error('Erreur lors du nettoyage automatique des réservations:', error);
    }
  }, CLEANUP_INTERVAL_MS);

  logger.info(
    `🧹 Job de nettoyage des réservations démarré (intervalle: ${CLEANUP_INTERVAL_MS / 1000}s)`
  );
});
