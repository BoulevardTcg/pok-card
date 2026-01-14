import { Request } from 'express';

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'ORDER_STATUS_UPDATE'
  | 'ORDER_SHIP'
  | 'ORDER_DELIVER'
  | 'USER_UPDATE'
  | 'USER_ROLE_CHANGE'
  | 'PROMO_CREATE'
  | 'PROMO_UPDATE'
  | 'PROMO_DELETE'
  | 'REVIEW_MODERATE'
  | 'REVIEW_DELETE'
  | 'STOCK_UPDATE'
  | 'IMAGE_UPLOAD'
  | 'IMAGE_DELETE';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  adminId: string | undefined;
  adminEmail?: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ip: string | undefined;
  userAgent: string | undefined;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Liste des champs à ne JAMAIS logger (sécurité)
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'twoFactorSecret',
]);

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Nettoie un objet en supprimant les champs sensibles
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Ignorer les champs sensibles
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Récursion pour les objets imbriqués
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Extrait l'IP du client depuis la requête
 */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress;
}

// ============================================================================
// AUDIT LOGGER PRINCIPAL
// ============================================================================

/**
 * Logger d'audit pour les actions admin
 * Les logs sont écrits en JSON pour faciliter l'analyse
 */
export function auditLog(
  req: Request,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {}
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    adminId: req.user?.userId,
    adminEmail: req.user?.email,
    resourceType,
    resourceId,
    details: sanitizeObject(details),
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'],
  };

  // Format JSON pour faciliter le parsing par des outils d'analyse
  const logLine = JSON.stringify({
    level: 'audit',
    ...entry,
  });

  // En production, on pourrait envoyer vers un service de logging centralisé
  // Pour l'instant, on log sur stdout/stderr
  if (process.env.NODE_ENV === 'production') {
    // En production, log vers stdout (sera capturé par le système de logs)
    process.stdout.write(`[AUDIT] ${logLine}\n`);
  }
}

// ============================================================================
// HELPERS POUR ACTIONS COURANTES
// ============================================================================

export const audit = {
  /**
   * Log création de produit
   */
  productCreated(req: Request, productId: string, productName: string): void {
    auditLog(req, 'PRODUCT_CREATE', 'product', productId, { name: productName });
  },

  /**
   * Log mise à jour de produit
   */
  productUpdated(req: Request, productId: string, changes: Record<string, unknown>): void {
    auditLog(req, 'PRODUCT_UPDATE', 'product', productId, { changes });
  },

  /**
   * Log suppression de produit
   */
  productDeleted(req: Request, productId: string, productName: string): void {
    auditLog(req, 'PRODUCT_DELETE', 'product', productId, { name: productName });
  },

  /**
   * Log mise à jour de stock
   */
  stockUpdated(
    req: Request,
    variantId: string,
    previousStock: number,
    newStock: number,
    reason?: string
  ): void {
    auditLog(req, 'STOCK_UPDATE', 'variant', variantId, {
      previousStock,
      newStock,
      delta: newStock - previousStock,
      reason,
    });
  },

  /**
   * Log expédition de commande
   */
  orderShipped(req: Request, orderId: string, trackingNumber: string, carrier: string): void {
    auditLog(req, 'ORDER_SHIP', 'order', orderId, { trackingNumber, carrier });
  },

  /**
   * Log livraison de commande
   */
  orderDelivered(req: Request, orderId: string): void {
    auditLog(req, 'ORDER_DELIVER', 'order', orderId, {});
  },

  /**
   * Log changement de statut de commande
   */
  orderStatusChanged(
    req: Request,
    orderId: string,
    previousStatus: string,
    newStatus: string
  ): void {
    auditLog(req, 'ORDER_STATUS_UPDATE', 'order', orderId, {
      previousStatus,
      newStatus,
    });
  },

  /**
   * Log modération d'avis
   */
  reviewModerated(req: Request, reviewId: string, approved: boolean): void {
    auditLog(req, 'REVIEW_MODERATE', 'review', reviewId, { approved });
  },

  /**
   * Log suppression d'avis
   */
  reviewDeleted(req: Request, reviewId: string): void {
    auditLog(req, 'REVIEW_DELETE', 'review', reviewId, {});
  },

  /**
   * Log création de code promo
   */
  promoCreated(req: Request, promoId: string, code: string): void {
    auditLog(req, 'PROMO_CREATE', 'promo', promoId, { code });
  },

  /**
   * Log mise à jour de code promo
   */
  promoUpdated(req: Request, promoId: string, changes: Record<string, unknown>): void {
    auditLog(req, 'PROMO_UPDATE', 'promo', promoId, { changes });
  },

  /**
   * Log suppression de code promo
   */
  promoDeleted(req: Request, promoId: string, code: string): void {
    auditLog(req, 'PROMO_DELETE', 'promo', promoId, { code });
  },

  /**
   * Log changement de rôle utilisateur
   */
  userRoleChanged(
    req: Request,
    userId: string,
    previousIsAdmin: boolean,
    newIsAdmin: boolean
  ): void {
    auditLog(req, 'USER_ROLE_CHANGE', 'user', userId, {
      previousIsAdmin,
      newIsAdmin,
    });
  },
};

export default audit;
