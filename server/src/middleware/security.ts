import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

const userRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userRateLimitStore.entries()) {
    if (value.resetAt < now) {
      userRateLimitStore.delete(key);
    }
  }
}, 60000); // Toutes les minutes
cleanupInterval.unref?.();

const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // Auth: 5 req / 15 min
  authStrict: { windowMs: 60 * 60 * 1000, max: 3 }, // Réinitialisation mdp: 3 req / 1h
  api: { windowMs: 15 * 60 * 1000, max: 100 }, // API publique: 100 req / 15 min
  apiAuthenticated: { windowMs: 15 * 60 * 1000, max: 500 }, // API authentifié: 500 req / 15 min
  admin: { windowMs: 15 * 60 * 1000, max: 200 }, // Admin: 200 req / 15 min
  upload: { windowMs: 60 * 60 * 1000, max: 50 }, // Upload: 50 req / 1h
  checkout: { windowMs: 60 * 60 * 1000, max: 10 }, // Checkout: 10 req / 1h
};

const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.userId;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return userId ? `user:${userId}` : `ip:${ip}`;
};

export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(RATE_LIMITS.auth.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator,
});

export const strictAuthLimiter = rateLimit({
  windowMs: RATE_LIMITS.authStrict.windowMs,
  max: RATE_LIMITS.authStrict.max,
  message: {
    error: 'Trop de tentatives. Réessayez dans 1 heure.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.api.windowMs,
  max: process.env.NODE_ENV === 'development' ? 1000 : RATE_LIMITS.api.max,
  message: {
    error: 'Trop de requêtes. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(RATE_LIMITS.api.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/api/checkout/webhook';
  },
  keyGenerator,
});

export const authenticatedApiLimiter = rateLimit({
  windowMs: RATE_LIMITS.apiAuthenticated.windowMs,
  max: RATE_LIMITS.apiAuthenticated.max,
  message: {
    error: 'Trop de requêtes. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req) => !(req as any).user, // Skip si pas authentifié
});

export const adminLimiter = rateLimit({
  windowMs: RATE_LIMITS.admin.windowMs,
  max: RATE_LIMITS.admin.max,
  message: {
    error: 'Trop de requêtes admin. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const uploadLimiter = rateLimit({
  windowMs: RATE_LIMITS.upload.windowMs,
  max: RATE_LIMITS.upload.max,
  message: {
    error: "Trop d'uploads. Réessayez dans 1 heure.",
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const checkoutLimiter = rateLimit({
  windowMs: RATE_LIMITS.checkout.windowMs,
  max: RATE_LIMITS.checkout.max,
  message: {
    error: 'Trop de tentatives de paiement. Réessayez dans 1 heure.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});

export const dynamicUserRateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = userRateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      userRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Trop de requêtes',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      });
    }

    record.count++;
    next();
  };
};

export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1024 * 1024) {
    // 1MB max
    return res.status(413).json({
      error: 'Payload trop volumineux',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
    return res.status(415).json({
      error: 'Type de contenu non supporté',
      code: 'UNSUPPORTED_MEDIA_TYPE',
    });
  }

  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Retirer < et >
        .replace(/javascript:/gi, '') // Retirer javascript:
        .replace(/on\w+\s*=/gi, '') // Retirer les event handlers (onclick=, etc.)
        .trim();
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'description' || key === 'imageUrl' || key === 'url' || key === 'images') {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  };

  if (req.path !== '/api/checkout/webhook') {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body);
    }
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

export const secureLogging = (req: Request, res: Response, next: NextFunction) => {
  const sanitizedUrl = req.url.replace(/\/api\/auth\/.*/, '/api/auth/***');
  console.log(`HTTP ${req.method} ${sanitizedUrl} - IP: ${req.ip}`);
  next();
};

export const injectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
  ];

  const checkInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some((pattern) => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkInjection);
    }
    return false;
  };

  if (checkInjection(req.body) || checkInjection(req.query) || checkInjection(req.params)) {
    return res.status(400).json({
      error: 'Contenu suspect détecté',
      code: 'SUSPICIOUS_CONTENT',
    });
  }

  next();
};

export const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 heures
};

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://checkout.stripe.com'],
      scriptSrc: ["'self'", 'https://js.stripe.com', 'https://checkout.stripe.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://*.stripe.com'],
      connectSrc: [
        "'self'",
        'https://api.tcgdex.net',
        'https://*.stripe.com',
        'https://r.stripe.com',
        'https://errors.stripe.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", 'https://checkout.stripe.com', 'https://js.stripe.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
