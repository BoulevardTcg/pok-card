// Configuration globale pour Jest
// Ce fichier est exécuté avant chaque fichier de test

// Augmenter le timeout pour les tests de base de données
jest.setTimeout(10000)

// Supprimer les warnings de console pendant les tests
global.console = {
  ...console,
  // Garder les erreurs et warnings importants
  error: jest.fn(),
  warn: jest.fn(),
  // Supprimer les logs normaux
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

