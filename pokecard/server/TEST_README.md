# Guide des Tests

Ce document explique comment lancer et utiliser les tests automatisés pour l'API backend.

## 📋 Prérequis

1. **Base de données de test** : Configurez une base de données de test séparée (recommandé) ou utilisez la même base avec nettoyage automatique.

2. **Variables d'environnement** : Créez un fichier `.env.test` avec :
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/test_db"
   TEST_DATABASE_URL="postgresql://username:password@localhost:5432/test_db"
   JWT_SECRET="test-secret-key"
   JWT_REFRESH_SECRET="test-refresh-secret-key"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   NODE_ENV="test"
   ```

3. **Stripe (pour les tests de checkout)** : Pour tester complètement Stripe, vous aurez besoin :
   - Des clés API Stripe de test (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
   - Ou utilisez Stripe CLI pour les webhooks locaux

## 🚀 Installation

```bash
cd server
npm install
```

## 🧪 Lancer les tests

### Tous les tests
```bash
npm test
```

### En mode watch (re-lance automatiquement)
```bash
npm run test:watch
```

### Avec couverture de code
```bash
npm run test:coverage
```

## 📁 Structure des tests

```
server/src/__tests__/
├── setup.ts          # Utilitaires de test (création d'utilisateurs, produits, etc.)
├── auth.test.ts      # Tests d'authentification (login, register, refresh, logout)
├── orders.test.ts    # Tests des commandes (GET /users/orders)
└── checkout.test.ts  # Tests du checkout Stripe (création de session, webhook)
```

## 🎯 Tests disponibles

### Auth Tests (`auth.test.ts`)
- ✅ Inscription d'un nouvel utilisateur
- ✅ Rejet d'email/nom d'utilisateur déjà utilisé
- ✅ Validation des mots de passe
- ✅ Connexion avec identifiants valides
- ✅ Rejet d'identifiants invalides
- ✅ Rafraîchissement de token
- ✅ Déconnexion

### Orders Tests (`orders.test.ts`)
- ✅ Récupération des commandes d'un utilisateur
- ✅ Filtrage par statut
- ✅ Isolation des commandes (un utilisateur ne voit que ses commandes)
- ✅ Récupération d'une commande spécifique
- ✅ Protection contre l'accès non autorisé

### Checkout Tests (`checkout.test.ts`)
- ✅ Création de session Stripe
- ✅ Gestion des utilisateurs anonymes
- ✅ Validation du panier
- ✅ Vérification du stock
- ⚠️ Tests de webhook (nécessitent configuration Stripe)

## 🔧 Configuration Stripe pour les tests

Pour tester les webhooks Stripe en local :

1. **Installer Stripe CLI** :
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   # Télécharger depuis https://stripe.com/docs/stripe-cli
   ```

2. **Se connecter** :
   ```bash
   stripe login
   ```

3. **Forwarder les webhooks** :
   ```bash
   stripe listen --forward-to localhost:8080/api/checkout/webhook
   ```

4. **Tester un événement** :
   ```bash
   stripe trigger checkout.session.completed
   ```

## 📊 Couverture de code

Les tests visent à couvrir :
- ✅ Routes d'authentification (100%)
- ✅ Routes de commandes (100%)
- ✅ Création de sessions Stripe (80% - webhook nécessite config)
- ✅ Validation des données
- ✅ Gestion des erreurs

## 🐛 Dépannage

### Erreur "Database connection failed"
- Vérifiez que votre base de données de test est accessible
- Vérifiez les variables d'environnement dans `.env.test`

### Erreur "JWT_SECRET is not defined"
- Assurez-vous que toutes les variables d'environnement sont définies

### Tests Stripe échouent
- Vérifiez que les clés Stripe de test sont configurées
- Pour les webhooks, utilisez Stripe CLI ou mocks

## 📝 Ajouter de nouveaux tests

1. Créez un nouveau fichier `*.test.ts` dans `src/__tests__/`
2. Importez les utilitaires depuis `setup.ts`
3. Utilisez `beforeAll`, `afterAll`, `beforeEach` pour la gestion des données
4. Utilisez `supertest` pour tester les routes Express

Exemple :
```typescript
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createApp } from '../app.js'
import { cleanupDatabase, prisma } from './setup.js'

const app = createApp()

describe('Ma Nouvelle Route', () => {
  beforeAll(async () => {
    await cleanupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
    await prisma.$disconnect()
  })

  it('devrait faire quelque chose', async () => {
    const response = await request(app)
      .get('/api/ma-route')
    
    expect(response.status).toBe(200)
  })
})
```

