import { vi } from 'vitest';

// Configuration globale pour Vitest
// Ce fichier est exécuté avant chaque fichier de test

// Secret requis pour tracking (generateOrderTrackingToken) et auth en tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET =
    'test-jwt-secret-min-64-chars-for-tracking-and-auth-in-tests-only-do-not-use-in-prod';
}

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
