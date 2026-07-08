import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import ebayRoutes from './routes/ebay.js';

// Import des middlewares de sécurité
import {
  helmetConfig,
  apiLimiter,
  cardSearchLimiter,
  validateInput,
  sanitizeInput,
  secureLogging,
  injectionProtection,
} from './middleware/security.js';

// Import du logger
import logger, { requestLoggerMiddleware } from './utils/logger.js';
import { normalizeTcgdexPricing } from './pricing/normalizeTcgdexPricing.js';
import { upsertTcgdexSnapshots } from './pricing/snapshotTcgdexPricing.js';
import prisma from './lib/prisma.js';
import { PriceMarket } from '@prisma/client';
import { getUtcDay } from './utils/date.js';

// Import Swagger pour la documentation API
import { setupSwagger } from './swagger.js';
import { validateEnvOrThrow } from './config/validateEnv.js';

const app = express();

// Trust proxy - nécessaire pour Railway/Heroku/etc. (derrière un load balancer)
// Permet à express-rate-limit de fonctionner correctement avec X-Forwarded-For
app.set('trust proxy', 1);

// Fail-fast env (prod) / warn (dev)
validateEnvOrThrow();

// Configuration CORS (Boutique 5173 + Marketplace 5174 toujours inclus)
const fromEnv =
  process.env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? [];
const defaultLocal = ['http://localhost:5173', 'http://localhost:5174'];
const allowedOrigins = [...new Set([...defaultLocal, ...fromEnv])];
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
app.use(cookieParser()); // Parse cookies (refresh token httpOnly)
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
const CACHE_TTL_SEARCH_MS = 5 * 60 * 1000;
const CACHE_TTL_CARD_MS = 60 * 60 * 1000; // 1h

type CacheEntry = { time: number; data: any; ttl?: number };
const cache = new Map<string, CacheEntry>();

const getCache = (key: string) => {
  const e = cache.get(key);
  if (!e) return null;
  const ttl = e.ttl ?? CACHE_TTL_MS;
  if (Date.now() - e.time > ttl) {
    cache.delete(key);
    return null;
  }
  return e.data;
};

const setCache = (key: string, data: any, ttlMs?: number) =>
  cache.set(key, { time: Date.now(), data, ttl: ttlMs });

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

// eBay - notifications de suppression/fermeture de compte (chemin exact enregistré côté eBay)
app.use('/ebay-notifications', ebayRoutes);

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

// Tri recherche cartes : ordre des ères TCG (plus récent au plus ancien)
const ERA_PREFIXES = [
  'sv',
  'me',
  'swsh',
  'sm',
  'xy',
  'bw',
  'hgss',
  'dp',
  'pl',
  'ex',
  'neo',
  'base',
  'ecard',
  'col',
  'dv',
  'cel',
  'rc',
  'det',
  'pop',
  'tk',
  'dpp',
  'bwp',
  'xyp',
  'smp',
  'swshp',
  'svp',
  'mep',
  'np',
  'jumbo',
  'wp',
];
const eraIndex = (setId: string): number => {
  const raw = (setId ?? '').toLowerCase();
  const i = ERA_PREFIXES.findIndex((p) => raw.startsWith(p));
  return i >= 0 ? i : ERA_PREFIXES.length;
};

// Normalisation de la requête recherche (correspondance noms TCGdex)
const normalizeSearchQuery = (query: string): string => {
  return query
    .replace(/\bmega\b/gi, 'méga')
    .replace(/\bdracolos(?:se)?\b/gi, 'dracolosse')
    .trim();
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

// Recherche de cartes (TCGdex) — rate limit uniquement sur cette route
app.get('/api/trade/cards/search', cardSearchLimiter, validateInput, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Le paramètre q est obligatoire (min. 2 caractères).',
      },
    });
  }
  const rawLimit = req.query.limit;
  const limit =
    Math.min(100, Math.max(1, typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : 100)) || 100;

  const qNormalized = normalizeSearchQuery(q);
  const cacheKey = `cards:search:${qNormalized.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json({ data: cached });

  try {
    const data = await fetchTCGdx(`cards?name=${encodeURIComponent(qNormalized)}`);
    if (!data || !Array.isArray(data)) {
      logger.warn('TCGdex search failed or invalid response', {
        endpoint: 'cards?name=',
        q: qNormalized,
      });
      return res.status(502).json({
        error: {
          code: 'TCGDEX_UNAVAILABLE',
          message: 'Service de recherche temporairement indisponible.',
        },
      });
    }
    const suggestions = data.map((c: any) => {
      const id = c.id ?? '';
      const setId = id.includes('-') ? id.split('-').slice(0, -1).join('-') : undefined;
      const baseImage = c.image ?? null;
      const image = baseImage ? `${baseImage}/low.webp` : undefined;
      return {
        id,
        name: c.name ?? '',
        localId: c.localId ?? undefined,
        image: image ?? undefined,
        set: setId ? { id: setId } : undefined,
      };
    });

    suggestions.sort((a: any, b: any) => {
      const aEra = eraIndex(a.set?.id);
      const bEra = eraIndex(b.set?.id);
      if (aEra !== bEra) return aEra - bEra; // ère la plus récente d'abord (index faible)
      const cmpSet = (b.set?.id ?? '').localeCompare(a.set?.id ?? ''); // même ère : set id décroissant
      if (cmpSet !== 0) return cmpSet;
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
    const results = suggestions.slice(0, limit);
    setCache(cacheKey, results, CACHE_TTL_SEARCH_MS);
    return res.json({ data: results });
  } catch (err) {
    logger.warn('TCGdex search error', {
      q: qNormalized,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(502).json({
      error: {
        code: 'TCGDEX_UNAVAILABLE',
        message: 'Service de recherche temporairement indisponible.',
      },
    });
  }
});

// Langues TCGdex supportées (japonais = "ja", pas "jp")
const TCGDEX_LANGS = ['fr', 'en', 'ja'] as const;
type TcgdexLang = (typeof TCGDEX_LANGS)[number];

function parseTcgdexLang(lang: string | undefined): TcgdexLang {
  const l = (lang ?? 'fr').toLowerCase();
  if (l === 'jp') return 'ja';
  if (TCGDEX_LANGS.includes(l as TcgdexLang)) return l as TcgdexLang;
  return 'fr';
}

// Courbes prix (historique snapshots)
app.get('/api/trade/cards/:id/price-history', validateInput, async (req, res) => {
  const id = req.params.id?.trim();
  const lang = parseTcgdexLang(req.query.lang as string);
  const market =
    (req.query.market as string)?.toLowerCase() === 'tcgplayer' ? 'TCGPLAYER' : 'CARDMARKET';
  const variant = (req.query.variant as string) || 'normal';
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 90));
  const metric = (req.query.metric as string) || 'trend';

  if (!id) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Identifiant carte requis.' },
    });
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await prisma.cardPriceSnapshot.findMany({
      where: {
        tcgdexCardId: id,
        lang,
        market: market as PriceMarket,
        variant,
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: 'asc' },
      select: {
        capturedDay: true,
        capturedAt: true,
        trend: true,
        avg: true,
        low: true,
        avg7: true,
        marketPrice: true,
      },
    });

    const valueKey =
      metric === 'avg'
        ? 'avg'
        : metric === 'low'
          ? 'low'
          : metric === 'avg7'
            ? 'avg7'
            : metric === 'marketPrice'
              ? 'marketPrice'
              : 'trend';
    const currency = market === 'CARDMARKET' ? 'EUR' : 'USD';
    const lastRow = rows[rows.length - 1];
    const points = rows.map((r) => {
      const v = (r as Record<string, unknown>)[valueKey];
      return {
        date: r.capturedDay,
        value: typeof v === 'number' ? v : null,
      };
    });

    res.json({
      data: {
        metadata: {
          currency,
          market,
          variant,
          lastUpdated: lastRow ? (lastRow.capturedAt as Date).toISOString() : null,
        },
        points,
      },
    });
  } catch (err) {
    logger.warn('Price history error', {
      id,
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: "Impossible de récupérer l'historique." },
    });
  }
});

/** Lundi UTC (YYYY-MM-DD) pour une date donnée (bucket week). */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Normalise lang: jp => ja, sinon lowercase. */
function normalizeLang(lang: string): string {
  const l = (lang ?? '').toLowerCase().trim();
  return l === 'jp' ? 'ja' : l || 'fr';
}

// POST /api/trade/cards/:id/sales — enregistrer une vente (MVP, manuel / seed)
app.post('/api/trade/cards/:id/sales', validateInput, async (req, res) => {
  const id = req.params.id?.trim();
  if (!id) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Identifiant carte requis.' },
    });
  }
  const body = req.body as Record<string, unknown>;
  const rawLang = body.lang;
  const lang = normalizeLang(typeof rawLang === 'string' ? rawLang : 'fr');
  const price = typeof body.price === 'number' ? body.price : parseFloat(String(body.price ?? ''));
  const qty = Math.max(1, Math.min(999, Number(body.qty) || 1));
  let soldAt: Date;
  try {
    const raw = body.soldAt;
    soldAt = raw instanceof Date ? raw : new Date(typeof raw === 'string' ? raw : '');
    if (Number.isNaN(soldAt.getTime())) throw new Error('Invalid date');
  } catch {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'soldAt invalide (ISO 8601 attendu).' },
    });
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'price doit être un nombre > 0.' },
    });
  }
  const currency =
    typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'EUR';
  const condition = typeof body.condition === 'string' ? body.condition.trim() || null : null;
  const finish = typeof body.finish === 'string' ? body.finish.trim() || null : null;

  try {
    await prisma.saleTransaction.create({
      data: {
        tcgdexCardId: id,
        lang,
        condition,
        finish,
        qty,
        price,
        currency,
        soldAt,
      },
    });
    return res.json({ data: { ok: true } });
  } catch (err) {
    logger.warn('Sale transaction create error', {
      id,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: "Impossible d'enregistrer la vente." },
    });
  }
});

// GET /api/trade/cards/:id/boulevard-history — courbes par langue (ventes internes)
app.get('/api/trade/cards/:id/boulevard-history', validateInput, async (req, res) => {
  const id = req.params.id?.trim();
  if (!id) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Identifiant carte requis.' },
    });
  }
  const rawLangs = (req.query.langs as string) || 'fr,en,ja';
  const langs = [
    ...new Set(
      rawLangs
        .split(',')
        .map((l) => normalizeLang(l.trim()))
        .filter(Boolean)
    ),
  ];
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 365));
  const bucket = (req.query.bucket as string) === 'week' ? 'week' : 'day';
  const metric = (req.query.metric as string) === 'avg' ? 'avg' : 'median';
  const placeholderZero = req.query.placeholderZero === '1' || req.query.placeholderZero === 'true';

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  try {
    const transactions = await prisma.saleTransaction.findMany({
      where: {
        tcgdexCardId: id,
        lang: { in: langs },
        soldAt: { gte: since },
      },
      orderBy: { soldAt: 'asc' },
      select: { lang: true, price: true, qty: true, soldAt: true, currency: true },
    });

    // MVP: filtrer EUR uniquement pour cohérence
    const eurOnly = transactions.filter((t) => t.currency.toUpperCase() === 'EUR');
    const hasMixed = transactions.length > 0 && eurOnly.length !== transactions.length;
    if (hasMixed)
      logger.debug('Boulevard history: mixed currencies', {
        id,
        total: transactions.length,
        eur: eurOnly.length,
      });
    const list = eurOnly.length > 0 ? eurOnly : transactions;

    type BucketKey = string;
    const byLangBucket: Record<
      string,
      Record<BucketKey, { prices: number[]; qtys: number[] }>
    > = {};
    for (const lang of langs) {
      byLangBucket[lang] = {};
    }
    for (const t of list) {
      const key: BucketKey = bucket === 'week' ? getWeekKey(t.soldAt) : getUtcDay(t.soldAt);
      if (!byLangBucket[t.lang]) byLangBucket[t.lang] = {};
      if (!byLangBucket[t.lang][key]) {
        byLangBucket[t.lang][key] = { prices: [], qtys: [] };
      }
      for (let i = 0; i < t.qty; i++) {
        byLangBucket[t.lang][key].prices.push(t.price);
        byLangBucket[t.lang][key].qtys.push(t.qty);
      }
    }

    function median(arr: number[]): number {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    }
    function avgWeighted(prices: number[], qtys: number[]): number {
      let sum = 0;
      let totalQty = 0;
      for (let i = 0; i < prices.length; i++) {
        sum += (prices[i] ?? 0) * (qtys[i] ?? 1);
        totalQty += qtys[i] ?? 1;
      }
      return totalQty > 0 ? sum / totalQty : 0;
    }

    const series: {
      lang: string;
      currency: string;
      points: { date: string; value: number | null }[];
    }[] = [];
    const allDates: string[] = [];
    for (let d = 0; d < days; d++) {
      const dte = new Date(since);
      dte.setUTCDate(dte.getUTCDate() + d);
      allDates.push(bucket === 'week' ? getWeekKey(dte) : getUtcDay(dte));
    }
    const uniqueDates = [...new Set(allDates)].sort();

    for (const lang of langs) {
      const buckets = byLangBucket[lang] ?? {};
      const points = uniqueDates.map((date) => {
        const cell = buckets[date];
        if (!cell || cell.prices.length === 0) return { date, value: null as number | null };
        const value =
          metric === 'median' ? median(cell.prices) : avgWeighted(cell.prices, cell.qtys);
        return { date, value };
      });
      const currency = list.find((t) => t.lang === lang)?.currency ?? 'EUR';
      series.push({ lang, currency, points });
    }

    const hasAnyData = list.length > 0;
    if (placeholderZero && !hasAnyData) {
      for (const s of series) {
        s.points = uniqueDates.map((date) => ({ date, value: 0 }));
      }
    }

    return res.json({
      data: {
        metadata: { bucket, metric },
        series,
        hasAnyData,
      },
    });
  } catch (err) {
    logger.warn('Boulevard history error', {
      id,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: "Impossible de récupérer l'historique Boulevard." },
    });
  }
});

// Détail d'une carte (TCGdex) — multilingue (fr|en|ja), snapshot du jour
app.get('/api/trade/cards/:id', validateInput, async (req, res) => {
  const id = req.params.id?.trim();
  const lang = parseTcgdexLang(req.query.lang as string);
  if (!id) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Identifiant carte requis.' },
    });
  }
  const cacheKey = `cards:detail:${id}:${lang}`;
  const cached = getCache(cacheKey) as {
    card: Record<string, unknown>;
    marketPricing: ReturnType<typeof normalizeTcgdexPricing>;
  } | null;
  if (cached) {
    upsertTcgdexSnapshots(id, lang, cached.marketPricing).catch((e) => {
      logger.debug('Snapshot (cache hit) failed', {
        id,
        lang,
        err: e instanceof Error ? e.message : String(e),
      });
    });
    return res.json({ data: { card: cached.card, marketPricing: cached.marketPricing } });
  }

  try {
    const response = await fetch(
      `https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(id)}`
    );
    if (response.status === 404) {
      return res.status(404).json({
        error: { code: 'CARD_NOT_FOUND', message: 'Carte introuvable.' },
      });
    }
    if (!response.ok) {
      logger.warn('TCGdex card detail non-ok', { id, lang, status: response.status });
      return res.status(502).json({
        error: { code: 'TCGDEX_UNAVAILABLE', message: 'Service temporairement indisponible.' },
      });
    }
    const card = (await response.json()) as Record<string, unknown> & {
      id?: string;
      name?: string;
      localId?: string;
      image?: string;
      rarity?: string;
      set?: { id?: string; name?: string; logo?: string; symbol?: string };
      serie?: { id?: string; name?: string };
      pricing?: unknown;
    };
    const marketPricing = normalizeTcgdexPricing(card.pricing);
    if (!card.pricing || Object.keys(marketPricing.sources).length === 0) {
      logger.debug('Card without pricing', { id, lang });
    }
    upsertTcgdexSnapshots(id, lang, marketPricing).catch((e) => {
      logger.debug('Snapshot failed', {
        id,
        lang,
        err: e instanceof Error ? e.message : String(e),
      });
    });
    setCache(cacheKey, { card, marketPricing }, CACHE_TTL_CARD_MS);
    return res.json({ data: { card, marketPricing } });
  } catch (err) {
    logger.warn('TCGdex card detail error', {
      id,
      lang,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(502).json({
      error: { code: 'TCGDEX_UNAVAILABLE', message: 'Service temporairement indisponible.' },
    });
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

export { app };

if (process.env.NODE_ENV !== 'test') {
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
}
