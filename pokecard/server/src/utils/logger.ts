import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Définir les niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
}

winston.addColors(colors)

// Format pour les logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Format pour la console (coloré et lisible)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}]: ${message}${metaStr}`
  })
)

// Rotation des fichiers de log
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
})

const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat,
})

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  transports: [
    // Console (toujours)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Fichiers (seulement en production)
    ...(process.env.NODE_ENV !== 'development' ? [fileRotateTransport, errorFileRotateTransport] : []),
  ],
})

// Helper pour les logs HTTP
export const httpLogger = {
  request: (req: any, duration?: number) => {
    const logData = {
      type: 'HTTP_REQUEST',
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId,
      ...(duration && { duration: `${duration}ms` }),
    }
    logger.http(`${req.method} ${req.originalUrl}`, logData)
  },
  
  response: (req: any, res: any, duration: number) => {
    const logData = {
      type: 'HTTP_RESPONSE',
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId,
    }
    
    if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData)
    } else {
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData)
    }
  },
}

// Helper pour les logs d'authentification
export const authLogger = {
  login: (userId: string, email: string, success: boolean, ip?: string) => {
    const logData = {
      type: 'AUTH_LOGIN',
      userId,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Masquer l'email
      success,
      ip,
    }
    if (success) {
      logger.info('Connexion réussie', logData)
    } else {
      logger.warn('Tentative de connexion échouée', logData)
    }
  },
  
  logout: (userId: string) => {
    logger.info('Déconnexion', { type: 'AUTH_LOGOUT', userId })
  },
  
  register: (userId: string, email: string) => {
    logger.info('Nouvel utilisateur inscrit', {
      type: 'AUTH_REGISTER',
      userId,
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
    })
  },
  
  twoFactorEnabled: (userId: string) => {
    logger.info('2FA activé', { type: 'AUTH_2FA_ENABLED', userId })
  },
  
  twoFactorDisabled: (userId: string) => {
    logger.info('2FA désactivé', { type: 'AUTH_2FA_DISABLED', userId })
  },
}

// Helper pour les logs de sécurité
export const securityLogger = {
  rateLimitExceeded: (ip: string, endpoint: string) => {
    logger.warn('Rate limit dépassé', {
      type: 'SECURITY_RATE_LIMIT',
      ip,
      endpoint,
    })
  },
  
  suspiciousActivity: (ip: string, reason: string, details?: any) => {
    logger.warn('Activité suspecte détectée', {
      type: 'SECURITY_SUSPICIOUS',
      ip,
      reason,
      ...details,
    })
  },
  
  accessDenied: (userId: string | undefined, resource: string) => {
    logger.warn('Accès refusé', {
      type: 'SECURITY_ACCESS_DENIED',
      userId,
      resource,
    })
  },
}

// Helper pour les logs business
export const businessLogger = {
  orderCreated: (orderId: string, userId: string | undefined, totalCents: number) => {
    logger.info('Nouvelle commande', {
      type: 'BUSINESS_ORDER_CREATED',
      orderId,
      userId,
      totalCents,
    })
  },
  
  paymentCompleted: (orderId: string, amount: number) => {
    logger.info('Paiement reçu', {
      type: 'BUSINESS_PAYMENT_COMPLETED',
      orderId,
      amount,
    })
  },
  
  productCreated: (productId: string, name: string) => {
    logger.info('Nouveau produit créé', {
      type: 'BUSINESS_PRODUCT_CREATED',
      productId,
      name,
    })
  },
}

// Middleware Express pour logger les requêtes
export const requestLoggerMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now()
  
  // Logger la requête entrante (debug uniquement)
  if (process.env.NODE_ENV === 'development') {
    httpLogger.request(req)
  }
  
  // Intercepter la réponse
  res.on('finish', () => {
    const duration = Date.now() - startTime
    httpLogger.response(req, res, duration)
  })
  
  next()
}

export default logger

