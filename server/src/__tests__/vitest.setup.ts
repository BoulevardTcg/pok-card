import { vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement de test AVANT toute autre chose
// Chercher .env.test depuis le répertoire du serveur
const envPath = path.resolve(__dirname, '../../.env.test');
dotenv.config({ path: envPath, override: false });

// S'assurer que NODE_ENV est défini à 'test'
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

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
