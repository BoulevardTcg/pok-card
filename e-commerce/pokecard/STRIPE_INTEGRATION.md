# 💳 Intégration Stripe Checkout - Guide Complet

Ce guide explique comment utiliser l'intégration Stripe Checkout dans le projet.

## 📋 Structure des fichiers

```
pokecard/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── stripe.ts              # Configuration Stripe centralisée
│   │   └── routes/
│   │       ├── checkout.ts            # Route complète (avec panier)
│   │       └── checkout-simple.ts     # Route simplifiée (quantity: 1)
│   └── env.example                    # Variables d'environnement
└── src/
    └── components/
        └── CheckoutButton.tsx         # Composant React pour le paiement
```

## 🔧 Installation

### 1. Dépendances Backend

Les dépendances sont déjà installées dans `server/package.json` :
- `stripe` : SDK Stripe officiel
- `@types/stripe` (dev) : Types TypeScript

### 2. Dépendances Frontend

Ajouter `@stripe/stripe-js` au `package.json` du frontend :

```bash
npm install @stripe/stripe-js
```

Ou si vous utilisez yarn :
```bash
yarn add @stripe/stripe-js
```

## 🔐 Configuration des variables d'environnement

### Backend (`.env` dans `server/`)

```env
# Clé secrète Stripe (obtenue depuis le dashboard Stripe)
STRIPE_SECRET_KEY="sk_test_VOTRE_CLE_SECRETE_STRIPE"

# Secret du webhook (obtenu depuis le dashboard Stripe > Webhooks)
STRIPE_WEBHOOK_SECRET="whsec_VOTRE_SECRET_WEBHOOK_STRIPE"

# Version de l'API Stripe (optionnel, défaut: 2024-06-20)
STRIPE_API_VERSION="2024-06-20"

# URLs de redirection après paiement
CHECKOUT_SUCCESS_URL="http://localhost:5173/checkout/success"
CHECKOUT_CANCEL_URL="http://localhost:5173/panier"

# URL du frontend (pour construire les URLs absolues)
FRONTEND_URL="http://localhost:5173"
```

### Frontend (`.env` dans la racine du projet)

```env
# Clé publique Stripe (obtenue depuis le dashboard Stripe)
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_VOTRE_CLE_PUBLIQUE_STRIPE"

# URL de l'API backend
VITE_API_URL="http://localhost:8080/api"
```

## 🚀 Utilisation

### Version Simplifiée (recommandée pour commencer)

#### Backend : Route `/api/checkout/create-checkout-session`

**Note** : Pour utiliser la version simplifiée, vous devez monter la route dans `server/src/index.ts` :

```typescript
import checkoutSimpleRoutes from './routes/checkout-simple.js'
// ...
app.use('/api/checkout', checkoutSimpleRoutes)
```

**Endpoint** : `POST /api/checkout/create-checkout-session`

**Body JSON** :
```json
{
  "quantity": 1
}
```

**Réponse** :
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

#### Frontend : Composant `CheckoutButton`

```tsx
import { CheckoutButton } from './components/CheckoutButton'

function MyComponent() {
  return (
    <div>
      <CheckoutButton quantity={1} className="btn-primary">
        Payer maintenant
      </CheckoutButton>
    </div>
  )
}
```

**Props disponibles** :
- `quantity` : Nombre de produits (défaut: 1)
- `className` : Classes CSS pour styliser le bouton
- `disabled` : Désactiver le bouton
- `children` : Contenu du bouton (défaut: "Payer")

### Version Complète (avec panier)

Le projet contient déjà une implémentation complète dans `server/src/routes/checkout.ts` qui gère :
- Un panier avec plusieurs produits
- Validation des stocks
- Gestion des variants de produits
- Création de commandes dans Prisma

Voir `src/CartPage.tsx` pour un exemple d'utilisation.

## 🔔 Webhook Stripe

Le webhook est déjà configuré dans `server/src/routes/checkout.ts` et monté dans `server/src/index.ts`.

### Configuration du webhook dans Stripe

1. Allez dans le [Dashboard Stripe](https://dashboard.stripe.com/webhooks)
2. Cliquez sur "Add endpoint"
3. Entrez l'URL de votre webhook : `https://votre-domaine.com/api/checkout/webhook`
4. Sélectionnez l'événement : `checkout.session.completed`
5. Copiez le "Signing secret" et ajoutez-le à `STRIPE_WEBHOOK_SECRET`

### En développement local

Utilisez [Stripe CLI](https://stripe.com/docs/stripe-cli) pour tester les webhooks localement :

```bash
stripe listen --forward-to localhost:8080/api/checkout/webhook
```

Cela vous donnera un secret de webhook temporaire à utiliser dans votre `.env`.

## 📊 Base de données

Le schéma Prisma contient déjà les modèles nécessaires :

- `Order` : Commandes
- `OrderItem` : Articles de commande
- `OrderStatus` : Statuts (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED, REFUNDED)

Le webhook met automatiquement à jour le statut de la commande à `CONFIRMED` après un paiement réussi.

## 🧪 Test

### Mode Test Stripe

Utilisez les cartes de test Stripe :
- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- Date d'expiration : n'importe quelle date future
- CVC : n'importe quel 3 chiffres

### Tester le composant

```tsx
import { CheckoutButton } from './components/CheckoutButton'

function TestPage() {
  return (
    <div>
      <h1>Test Stripe Checkout</h1>
      <CheckoutButton quantity={1}>
        Tester le paiement
      </CheckoutButton>
    </div>
  )
}
```

## 🔒 Sécurité

- ✅ Les clés secrètes sont stockées dans des variables d'environnement
- ✅ Le webhook vérifie la signature Stripe
- ✅ Les URLs de redirection sont validées
- ✅ Les prix sont revalidés côté serveur lors du webhook
- ✅ Le stock est vérifié et décrémenté de manière atomique

## 📝 Notes importantes

1. **Clés de test vs production** :
   - Utilisez `sk_test_...` et `pk_test_...` en développement
   - Utilisez `sk_live_...` et `pk_live_...` en production

2. **Webhook en production** :
   - Configurez l'URL du webhook dans le dashboard Stripe
   - Utilisez HTTPS pour le webhook
   - Le secret du webhook doit être différent entre test et production

3. **Extension future** :
   - Pour passer un `productId` au lieu de `quantity`, modifiez `checkout-simple.ts`
   - Pour gérer un panier complet, utilisez `checkout.ts` existant

## 🐛 Dépannage

### Erreur "Stripe n'est pas configuré"
- Vérifiez que `STRIPE_SECRET_KEY` est défini dans `.env`
- Redémarrez le serveur après avoir modifié `.env`

### Erreur "VITE_STRIPE_PUBLISHABLE_KEY n'est pas définie"
- Vérifiez que la variable est définie dans `.env` à la racine du projet
- Redémarrez le serveur de développement Vite

### Le webhook ne fonctionne pas
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Utilisez Stripe CLI pour tester localement
- Vérifiez les logs du serveur pour les erreurs

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

