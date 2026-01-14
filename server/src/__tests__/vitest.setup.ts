// IMPORTANT: NODE_ENV doit être défini AVANT tout import
process.env.NODE_ENV ||= 'test';

import { vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log optionnel pour vérifier que le setup est chargé
if (process.env.DEBUG_TEST_SETUP === '1') {
  console.log('[vitest.setup] loaded');
}

// Charger les variables d'environnement de test AVANT toute autre chose
// Chercher .env.test depuis le répertoire du serveur
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath, override: false });

// S'assurer que NODE_ENV est défini à 'test' (redondance pour sécurité)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Configuration des variables d'environnement par défaut pour les tests
// Ces valeurs sont utilisées si les variables ne sont pas définies
const defaultTestEnv = {
  // JWT
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'test_jwt_secret_key_at_least_64_characters_long_for_security_config_validation',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    'test_jwt_refresh_secret_key_at_least_64_characters_long_for_security_config_validation',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_testing_purposes_only',
  STRIPE_WEBHOOK_SECRET:
    process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy_webhook_secret_for_testing',
  STRIPE_API_VERSION: process.env.STRIPE_API_VERSION || '2024-06-20',

  // Email/SMTP
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  SMTP_USER: process.env.SMTP_USER || 'test@example.com',
  SMTP_PASS: process.env.SMTP_PASS || 'dummy_password',
  SHOP_NAME: process.env.SHOP_NAME || 'Test Shop',
  SHOP_EMAIL: process.env.SHOP_EMAIL || 'test@example.com',
  SHOP_URL: process.env.SHOP_URL || 'http://localhost:3000',
  EMAIL_FROM: process.env.EMAIL_FROM || 'test@example.com',

  // Frontend URLs
  FRONTEND_PUBLIC_URL: process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  CHECKOUT_SUCCESS_URL:
    process.env.CHECKOUT_SUCCESS_URL || 'http://localhost:3000/checkout/success',
  CHECKOUT_CANCEL_URL: process.env.CHECKOUT_CANCEL_URL || 'http://localhost:3000/panier',
  ALLOWED_REDIRECT_DOMAINS: process.env.ALLOWED_REDIRECT_DOMAINS || 'http://localhost:3000',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Tracking
  ORDER_TRACKING_SECRET:
    process.env.ORDER_TRACKING_SECRET ||
    'test_order_tracking_secret_key_at_least_64_characters_long_for_security_config_validation',
};

// Appliquer les valeurs par défaut si elles ne sont pas définies
for (const [key, value] of Object.entries(defaultTestEnv)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Helpers pour les mocks Stripe (évite les casts "moches" partout)
export function asStripeSession(
  partial: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session {
  return partial as unknown as Stripe.Checkout.Session;
}

export function asStripeEvent(partial: Partial<Stripe.Event>): Stripe.Event {
  return partial as unknown as Stripe.Event;
}

// Mock Stripe global pour tous les tests
// Compatible ESM et CJS
vi.mock('../config/stripe.js', () => {
  // Helper local pour le cast (car vi.mock est hoisted, on ne peut pas utiliser les exports)
  const asStripeSession = (partial: Partial<Stripe.Checkout.Session>): Stripe.Checkout.Session =>
    partial as unknown as Stripe.Checkout.Session;

  const asStripeEvent = (partial: Partial<Stripe.Event>): Stripe.Event =>
    partial as unknown as Stripe.Event;

  // Créer les objets mockés via les helpers
  const mockSession = asStripeSession({
    id: 'cs_test_mock_session_id',
    object: 'checkout.session',
    url: 'https://checkout.stripe.com/test',
    metadata: {
      ownerKey: 'cart:test-cart-id',
      cartId: 'test-cart-id',
    },
    currency: 'eur',
    payment_status: 'unpaid',
    customer_details: {
      email: 'test@example.com',
    } as any,
  });

  const mockEvent = asStripeEvent({
    id: 'evt_test_mock_event_id',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: mockSession,
    },
  });

  const mockCheckoutSessionsCreate = vi.fn((config: any) =>
    Promise.resolve(
      asStripeSession({
        ...mockSession,
        metadata: config?.metadata || mockSession.metadata,
        currency: config?.currency || mockSession.currency,
        customer_details: {
          email:
            config?.customer_email || mockSession.customer_details?.email || 'test@example.com',
        } as any,
        shipping_details: config?.shipping_address_collection
          ? {
              address: config.shipping_address_collection,
            }
          : null,
      })
    )
  );

  const mockWebhooksConstructEvent = vi.fn((payload: any, signature: string, secret: string) => {
    // Simuler un événement webhook Stripe valide
    return mockEvent;
  });

  // Mock de l'instance Stripe
  const mockStripeInstance = {
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  };

  return {
    stripe: mockStripeInstance,
    ensureStripeConfigured: () => mockStripeInstance,
    // Export par défaut pour compatibilité CJS
    default: mockStripeInstance,
  };
});

// Configuration globale pour Vitest
// Ce fichier est exécuté avant chaque fichier de test

// Augmenter le timeout pour les tests de base de données
vi.setConfig({ testTimeout: 10000 });

// Supprimer les warnings de console pendant les tests
global.console = {
  ...console,
  // Garder les erreurs et warnings importants
  error: vi.fn(),
  warn: vi.fn(),
  // Supprimer les logs normaux
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
