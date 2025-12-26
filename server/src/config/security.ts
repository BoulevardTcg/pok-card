// ===== CONFIGURATION DE SÉCURITÉ CENTRALISÉE =====

export const SECURITY_CONFIG = {
  // JWT
  JWT: {
    ACCESS_TOKEN_EXPIRY: process.env.JWT_EXPIRES_IN || '15m',
    REFRESH_TOKEN_EXPIRY: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    SECRET_MIN_LENGTH: 64,
  },

  // Rate Limiting
  RATE_LIMIT: {
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_ATTEMPTS: 5,
    },
    API: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_REQUESTS: 100,
    },
  },

  // Validation
  VALIDATION: {
    MAX_PAYLOAD_SIZE: '1mb',
    MAX_STRING_LENGTH: 1000,
    ALLOWED_ORIGINS: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  },

  // Logging
  LOGGING: {
    SENSITIVE_FIELDS: ['password', 'token', 'authorization', 'cookie'],
    DEBUG_MODE: process.env.NODE_ENV === 'development',
  },

  // Headers de sécurité
  SECURITY_HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 an
    CSP: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.tcgdex.net'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
};

// Vérification de la configuration
export const validateSecurityConfig = () => {
  const errors: string[] = [];

  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH
  ) {
    errors.push(
      `JWT_SECRET doit faire au moins ${SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH} caractères`
    );
  }

  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH
  ) {
    errors.push(
      `JWT_REFRESH_SECRET doit faire au moins ${SECURITY_CONFIG.JWT.SECRET_MIN_LENGTH} caractères`
    );
  }

  if (process.env.NODE_ENV === 'production' && SECURITY_CONFIG.LOGGING.DEBUG_MODE) {
    errors.push('Le mode debug ne doit pas être activé en production');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
