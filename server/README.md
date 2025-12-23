# 🚀 Backend BoulevardTCG - API d'authentification et gestion des utilisateurs

Ce backend fournit une API complète pour l'authentification, la gestion des utilisateurs et le système de cartes TCG.

## 🛠️ Technologies utilisées

- **Node.js** avec **TypeScript**
- **Express.js** pour l'API REST
- **Prisma** comme ORM avec **SQLite**
- **JWT** pour l'authentification
- **bcryptjs** pour le hashage des mots de passe
- **express-validator** pour la validation des données

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn

## 🚀 Installation et démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Le fichier `.env` est déjà configuré avec :
- Base de données SQLite
- Clés JWT (à changer en production)
- Port 8080
- CORS configuré pour localhost:5173
- Variables Stripe :
  - `STRIPE_SECRET_KEY` : clé secrète Stripe
  - `STRIPE_WEBHOOK_SECRET` : secret du webhook Checkout
  - `CHECKOUT_SUCCESS_URL` : URL de succès (ex: `http://localhost:5173/checkout/success`)
  - `CHECKOUT_CANCEL_URL` : URL d'annulation (ex: `http://localhost:5173/panier`)
  - (Optionnel) `STRIPE_API_VERSION` pour verrouiller la version de l'API Stripe

### 3. Initialiser la base de données
```bash
# Générer le client Prisma
npx prisma generate

# Créer et synchroniser la base de données
npx prisma db push

# Exécuter le script de seed (optionnel)
npx tsx prisma/seed.ts
```

### 4. Démarrer le serveur
```bash
# Mode développement avec hot reload
npm run dev

# Mode production
npm run build
npm start
```

## 🔐 API d'authentification

### Inscription
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "your-secure-password",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Connexion
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

### Rafraîchir le token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Déconnexion
```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

## 👤 API utilisateurs

### Récupérer le profil
```http
GET /api/users/profile
Authorization: Bearer your_access_token
```

### Mettre à jour le profil
```http
PUT /api/users/profile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Ma bio"
}
```

### Changer le mot de passe
```http
PUT /api/users/change-password
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "currentPassword": "your-current-password",
  "newPassword": "your-new-secure-password"
}
```

### Gérer les favoris
```http
# Récupérer les favoris
GET /api/users/favorites?page=1&limit=20
Authorization: Bearer your_access_token

# Ajouter aux favoris
POST /api/users/favorites
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "cardId": "swsh3-136",
  "cardName": "Fouinar",
  "cardImage": "https://assets.tcgdex.net/fr/swsh/swsh3/136/high.png",
  "cardSet": "Épée et Bouclier – Ténèbres Embrasées"
}

# Supprimer des favoris
DELETE /api/users/favorites/swsh3-136
Authorization: Bearer your_access_token
```

## 🃏 API Trade (cartes TCG)

### Récupérer les séries
```http
GET /api/trade/sets
```

### Récupérer les cartes d'une série
```http
GET /api/trade/sets/swsh3/cards
```

## 🛒 API Produits

### Liste des produits
```http
GET /api/products?page=1&limit=12&category=Pokémon
```

### Détail produit
```http
GET /api/products/:slug
```

Réponse type :
```json
{
  "product": {
    "id": "...",
    "slug": "display-booster-pokemon-ecarlate-violet",
    "name": "Display Booster Pokémon - Écarlate & Violet",
    "description": "...",
    "category": "Pokémon",
    "image": { "url": "...", "altText": "..." },
    "images": [...],
    "variants": [
      {
        "id": "...",
        "name": "Français",
        "language": "Français",
        "edition": "1ère édition",
        "priceCents": 16999,
        "stock": 12
      }
    ],
    "minPriceCents": 1499,
    "outOfStock": false
  }
}
```

## 💳 API Checkout Stripe

### Créer une session de paiement
```http
POST /api/checkout/create-session
Content-Type: application/json

{
  "items": [
    { "variantId": "ckv...", "quantity": 2 },
    { "variantId": "ckw...", "quantity": 1 }
  ],
  "customerEmail": "client@example.com"
}
```

Réponse :
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

⚠️ Configurez le webhook Stripe Checkout vers `/api/checkout/webhook` avec le secret `STRIPE_WEBHOOK_SECRET`. Lors du statut `checkout.session.completed`, les stocks sont décrémentés et une commande est créée.

## 🔒 Sécurité

### Middleware d'authentification
- `authenticateToken` : Vérifie le token JWT
- `requireAdmin` : Accès administrateur requis
- `requireOwnerOrAdmin` : Propriétaire ou admin
- `optionalAuth` : Authentification optionnelle

### Validation des données
- Validation des emails, mots de passe, noms d'utilisateur
- Sanitisation des entrées
- Messages d'erreur en français

## 📊 Base de données

### Modèles principaux
- **User** : Utilisateurs avec profils
- **UserProfile** : Informations étendues
- **Favorite** : Cartes favorites des utilisateurs
- **Order** : Commandes et historique
- **TradeOffer** : Offres d'échange
- **ContestTicket** : Participation aux concours
- **RefreshToken** : Tokens de rafraîchissement

## 🧪 Utilisateurs de test

Après le seeding, vous pouvez utiliser :

- **Admin** : `admin@boulevardtcg.com` / `Admin123!`
- **Test 1** : `john.doe@example.com` / `Test123!`
- **Test 2** : `jane.smith@example.com` / `Test123!`

## 🚨 Production

⚠️ **Important** : Avant de déployer en production :

1. Changer les clés JWT dans `.env`
2. Utiliser une base de données PostgreSQL/MySQL
3. Configurer HTTPS
4. Mettre en place un rate limiting
5. Configurer la journalisation
6. Mettre en place la surveillance

## 📝 Structure des fichiers

```
server/
├── src/
│   ├── index.ts          # Point d'entrée principal
│   ├── routes/
│   │   ├── auth.ts       # Routes d'authentification
│   │   └── users.ts      # Routes utilisateurs
│   ├── middleware/
│   │   └── auth.ts       # Middleware d'authentification
│   └── utils/
│       └── auth.ts       # Utilitaires JWT et bcrypt
├── prisma/
│   ├── schema.prisma     # Schéma de base de données
│   └── seed.ts           # Script d'initialisation
├── .env                  # Variables d'environnement
└── package.json          # Dépendances et scripts
```

## 🔍 Débogage

### Logs du serveur
Le serveur affiche des informations détaillées au démarrage et lors des erreurs.

### Vérification de la santé
```http
GET /api/health
```

### Vérification des tokens
```http
GET /api/auth/verify
Authorization: Bearer your_token
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.
