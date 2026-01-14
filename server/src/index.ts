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

// Import des middlewares de sécurité
import {
  helmetConfig,
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
const swaggerEnabled = isDevelopment || process.env.ENABLE_SWAGGER === 'true';

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

// Webhook Stripe - doit utiliser express.raw avant express.json
app.post(
  '/api/checkout/webhook',
  express.raw({ type: 'application/json' }),
  checkoutWebhookHandler
);

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

// Route de santé
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Documentation API Swagger (dev only by default)
if (swaggerEnabled) {
  setupSwagger(app);
}

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

    setCache(key, filteredSets);
    res.json(filteredSets);
  } catch {
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
  } catch {
    res.json([]);
  }
});

// Gestion des erreurs globales
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  if (swaggerEnabled) {
    logger.info(`📖 Documentation API: http://${host}:${port}/api-docs`);
  }
});
