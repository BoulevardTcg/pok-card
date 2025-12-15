import { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'

// Rate limiting pour prévenir les attaques par force brute
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par IP
  message: {
    error: 'Trop de requêtes. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Middleware de validation des entrées
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Vérifier la taille du body
  const contentLength = parseInt(req.headers['content-length'] || '0')
  if (contentLength > 1024 * 1024) { // 1MB max
    return res.status(413).json({
      error: 'Payload trop volumineux',
      code: 'PAYLOAD_TOO_LARGE'
    })
  }

  // Vérifier le type de contenu
  if (req.headers['content-type'] && !req.headers['content-type'].includes('application/json')) {
    return res.status(415).json({
      error: 'Type de contenu non supporté',
      code: 'UNSUPPORTED_MEDIA_TYPE'
    })
  }

  next()
}

// Middleware de sanitisation améliorée
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Fonction de sanitisation améliorée
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Retirer les caractères dangereux pour XSS
      return obj
        .replace(/[<>]/g, '') // Retirer < et >
        .replace(/javascript:/gi, '') // Retirer javascript:
        .replace(/on\w+\s*=/gi, '') // Retirer les event handlers (onclick=, etc.)
        .trim()
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize)
    }
    
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Ne pas sanitizer les champs qui doivent contenir du HTML ou des URLs
      // (comme les descriptions de produits ou les URLs d'images)
      if (key === 'description' || key === 'imageUrl' || key === 'url' || key === 'images') {
        sanitized[key] = value
      } else {
        sanitized[key] = sanitize(value)
      }
    }
    return sanitized
  }

  // Ne pas sanitizer le body du webhook Stripe (contient des données binaires)
  if (req.path !== '/api/checkout/webhook') {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitize(req.body)
    }
  }
  
  if (req.query) {
    req.query = sanitize(req.query)
  }
  
  if (req.params) {
    req.params = sanitize(req.params)
  }

  next()
}

// Middleware de logging sécurisé
export const secureLogging = (req: Request, res: Response, next: NextFunction) => {
  // Masquer les informations sensibles dans les logs
  const sanitizedUrl = req.url.replace(/\/api\/auth\/.*/, '/api/auth/***')
  const sanitizedHeaders = { ...req.headers }
  delete sanitizedHeaders.authorization
  delete sanitizedHeaders.cookie
  
  console.log(`🔒 ${req.method} ${sanitizedUrl} - IP: ${req.ip}`)
  
  next()
}

// Middleware de protection contre les attaques par injection
export const injectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i
  ]

  const checkInjection = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj))
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkInjection)
    }
    return false
  }

  if (checkInjection(req.body) || checkInjection(req.query) || checkInjection(req.params)) {
    return res.status(400).json({
      error: 'Contenu suspect détecté',
      code: 'SUSPICIOUS_CONTENT'
    })
  }

  next()
}

// Configuration CORS sécurisée
export const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 heures
}

// Configuration Helmet pour les headers de sécurité
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.tcgdex.net"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
})
