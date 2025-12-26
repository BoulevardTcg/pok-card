import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, JWTPayload } from '../utils/auth.js'

// Étendre l'interface Request pour inclure l'utilisateur
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

// Middleware d'authentification
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token d\'accès requis',
      code: 'ACCESS_TOKEN_REQUIRED'
    })
  }

  try {
    const user = verifyAccessToken(token)
    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ 
      error: 'Token invalide ou expiré',
      code: 'INVALID_TOKEN'
    })
  }
}

// Middleware d'autorisation admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED'
    })
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Accès administrateur requis',
      code: 'ADMIN_ACCESS_REQUIRED'
    })
  }

  next()
}

// Middleware d'autorisation propriétaire ou admin
export const requireOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentification requise',
      code: 'AUTHENTICATION_REQUIRED'
    })
  }

  // Si c'est un admin, autoriser
  if (req.user.isAdmin) {
    return next()
  }

  // Si c'est le propriétaire, autoriser
  const resourceUserId = req.params.userId || req.body.userId
  if (req.user.userId === resourceUserId) {
    return next()
  }

  return res.status(403).json({ 
    error: 'Accès non autorisé à cette ressource',
    code: 'UNAUTHORIZED_ACCESS'
  })
}

// Middleware optionnel d'authentification (pour les routes qui peuvent être publiques ou privées)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const user = verifyAccessToken(token)
      req.user = user
    } catch (error) {
      // Token invalide, mais on continue sans utilisateur
      req.user = undefined
    }
  }

  next()
}
