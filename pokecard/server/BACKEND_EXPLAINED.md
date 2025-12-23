# 🚀 Guide Complet du Backend BoulevardTCG

## 📋 Table des Matières

1. [Architecture Générale](#architecture-générale)
2. [Technologies Utilisées](#technologies-utilisées)
3. [Structure des Fichiers](#structure-des-fichiers)
4. [Démarrage du Serveur](#démarrage-du-serveur)
5. [Base de Données](#base-de-données)
6. [Routes API](#routes-api)
7. [Authentification](#authentification)
8. [Sécurité](#sécurité)
9. [Paiements Stripe](#paiements-stripe)
10. [Flux de Données](#flux-de-données)

---

## 🏗️ Architecture Générale

Le backend est une **API REST** construite avec **Node.js** et **Express.js**. Il suit une architecture modulaire avec :

- **Routes** : Gèrent les endpoints API
- **Middlewares** : Sécurité, validation, authentification
- **Utils** : Fonctions utilitaires (auth, validation)
- **Prisma** : ORM pour la base de données
- **Stripe** : Gestion des paiements

```
┌─────────────┐
│   Frontend  │ (React)
└──────┬──────┘
       │ HTTP/HTTPS
       ▼
┌─────────────┐
│   Express   │ (API REST)
│   Server    │
└──────┬──────┘
       │
       ├──► Prisma ──► SQLite (Base de données)
       ├──► Stripe ──► Paiements
       └──► TCGdx API ──► Données cartes Pokémon
```

---

## 🛠️ Technologies Utilisées

### Core
- **Node.js** : Runtime JavaScript
- **TypeScript** : Typage statique
- **Express.js** : Framework web
- **Prisma** : ORM (Object-Relational Mapping)
- **SQLite** : Base de données

### Sécurité
- **JWT** : Tokens d'authentification
- **bcryptjs** : Hashage des mots de passe
- **Helmet** : Headers de sécurité
- **CORS** : Protection cross-origin
- **express-rate-limit** : Rate limiting

### Paiements
- **Stripe** : Plateforme de paiement

### Validation
- **express-validator** : Validation des données

---

## 📁 Structure des Fichiers

```
server/
├── src/
│   ├── index.ts                 # Point d'entrée du serveur
│   ├── routes/                  # Routes API
│   │   ├── auth.ts             # Authentification (login, register)
│   │   ├── users.ts            # Gestion des utilisateurs
│   │   ├── products.ts         # Gestion des produits
│   │   └── checkout.ts         # Paiements Stripe
│   ├── middleware/              # Middlewares
│   │   ├── auth.ts             # Authentification JWT
│   │   └── security.ts         # Sécurité (CORS, rate limiting, etc.)
│   ├── utils/                   # Utilitaires
│   │   └── auth.ts             # Fonctions d'authentification
│   └── config/                  # Configuration
│       └── security.ts         # Configuration de sécurité
├── prisma/
│   ├── schema.prisma           # Schéma de la base de données
│   └── seed.ts                 # Données de test
├── .env                        # Variables d'environnement
└── package.json                # Dépendances
```

---

## 🚀 Démarrage du Serveur

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Créez un fichier `.env` avec les variables nécessaires (voir `env.example`)

### 3. Initialisation de la base de données
```bash
# Générer le client Prisma
npx prisma generate

# Créer la base de données
npx prisma db push

# Remplir avec des données de test (optionnel)
npm run seed
```

### 4. Démarrer le serveur
```bash
# Mode développement (avec hot reload)
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:8080`

---

## 💾 Base de Données

### Schéma Prisma

La base de données utilise **SQLite** avec **Prisma ORM**. Voici les modèles principaux :

#### 👤 User (Utilisateur)
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  username    String   @unique
  password    String   // Hashé avec bcrypt
  firstName   String?
  lastName    String?
  isAdmin     Boolean  @default(false)
  isVerified  Boolean  @default(false)
  // Relations
  profile     UserProfile?
  favorites   Favorite[]
  orders      Order[]
  refreshTokens RefreshToken[]
}
```

#### 🛒 Product (Produit)
```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique  // URL-friendly
  description String?
  category    String
  images      ProductImage[]
  variants    ProductVariant[]
}
```

#### 📦 ProductVariant (Variante de Produit)
```prisma
model ProductVariant {
  id           String   @id @default(cuid())
  productId    String
  name         String
  priceCents   Int      // Prix en centimes
  stock        Int      @default(0)
  sku          String?
  isActive     Boolean  @default(true)
}
```

#### 📝 Order (Commande)
```prisma
model Order {
  id            String   @id @default(cuid())
  orderNumber   String   @unique
  status        OrderStatus
  totalCents    Int
  currency      String   @default("EUR")
  items         OrderItem[]
  userId        String?
}
```

### Relations

- **User** → **UserProfile** : 1:1 (un utilisateur a un profil)
- **User** → **Order** : 1:N (un utilisateur a plusieurs commandes)
- **Product** → **ProductVariant** : 1:N (un produit a plusieurs variantes)
- **Product** → **ProductImage** : 1:N (un produit a plusieurs images)
- **Order** → **OrderItem** : 1:N (une commande a plusieurs articles)

---

## 🛣️ Routes API

### 🔐 Authentification (`/api/auth`)

#### POST `/api/auth/register`
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "your-secure-password",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Connexion d'un utilisateur
```json
{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```
**Réponse** :
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

#### POST `/api/auth/refresh`
Rafraîchir le token d'accès
```json
{
  "refreshToken": "eyJhbGc..."
}
```

#### POST `/api/auth/logout`
Déconnexion (révoque le refresh token)

---

### 👤 Utilisateurs (`/api/users`)

Toutes les routes nécessitent une authentification (`Authorization: Bearer <token>`)

#### GET `/api/users/profile`
Récupère le profil de l'utilisateur connecté

#### PUT `/api/users/profile`
Met à jour le profil
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Ma bio"
}
```

#### PUT `/api/users/change-password`
Change le mot de passe
```json
{
  "currentPassword": "your-current-password",
  "newPassword": "your-new-secure-password"
}
```

#### GET `/api/users/favorites`
Récupère les favoris de l'utilisateur

#### POST `/api/users/favorites`
Ajoute une carte aux favoris
```json
{
  "cardId": "card123",
  "cardName": "Pikachu",
  "cardImage": "https://...",
  "cardSet": "Base Set"
}
```

#### GET `/api/users/orders`
Récupère les commandes de l'utilisateur

---

### 🛒 Produits (`/api/products`)

#### GET `/api/products`
Liste des produits (pagination, recherche, catégorie)
```
GET /api/products?page=1&limit=12&category=Accessoires&search=Display
```

#### GET `/api/products/:slug`
Détails d'un produit par son slug
```
GET /api/products/display-pikachu-led-premium
```

---

### 💳 Paiements (`/api/checkout`)

#### POST `/api/checkout/create-session`
Crée une session de paiement Stripe
```json
{
  "items": [
    {
      "variantId": "variant123",
      "quantity": 2
    }
  ],
  "customerEmail": "user@example.com"
}
```
**Réponse** :
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### POST `/api/checkout/webhook`
Webhook Stripe (appelé automatiquement par Stripe après paiement)
- Vérifie la signature
- Décrémente le stock
- Crée la commande en base de données

---

### 🃏 Trade (`/api/trade`)

#### GET `/api/trade/sets`
Récupère les séries de cartes depuis l'API TCGdx (avec cache)

#### GET `/api/trade/sets/:id/cards`
Récupère les cartes d'une série (avec cache)

---

## 🔐 Authentification

### Flux d'Authentification

1. **Inscription/Connexion** :
   - L'utilisateur s'inscrit ou se connecte
   - Le serveur vérifie les identifiants
   - Génération de deux tokens :
     - **Access Token** : Valide 15 minutes
     - **Refresh Token** : Valide 7 jours (stocké en DB)

2. **Utilisation des tokens** :
   - Le frontend envoie l'access token dans le header :
     ```
     Authorization: Bearer <accessToken>
     ```
   - Le middleware `authenticateToken` vérifie le token
   - Si valide, `req.user` contient les infos de l'utilisateur

3. **Rafraîchissement** :
   - Quand l'access token expire, le frontend utilise le refresh token
   - Le serveur génère un nouveau access token
   - Le refresh token reste valide

### Sécurité des Mots de Passe

- **Hashage** : bcrypt avec 12 rounds (salage automatique)
- **Stockage** : Seul le hash est stocké, jamais le mot de passe en clair
- **Validation** : Minimum 8 caractères, majuscule, minuscule, chiffre

---

## 🛡️ Sécurité

### Middlewares de Sécurité

1. **Helmet** : Headers de sécurité HTTP
2. **CORS** : Protection cross-origin (origines autorisées uniquement)
3. **Rate Limiting** : Limite les requêtes (100/15min, 5 tentatives auth/15min)
4. **Validation** : Validation des données d'entrée (express-validator)
5. **Sanitisation** : Nettoyage des entrées utilisateur
6. **Injection Protection** : Détection de tentatives d'injection

### Protection des Routes

- **Authentification** : `authenticateToken` vérifie le JWT
- **Autorisation** : `requireAdmin` pour les routes admin
- **Propriétaire** : `requireOwnerOrAdmin` pour les ressources utilisateur

### Validation des Données

Toutes les données sont validées avant traitement :
- Types de données
- Formats (email, URL, etc.)
- Longueurs minimales/maximales
- Patterns (regex)

---

## 💳 Paiements Stripe

### Flux de Paiement

1. **Création de Session** :
   ```
   Frontend → POST /api/checkout/create-session
   ```
   - Validation du stock
   - Validation des quantités
   - Validation des prix
   - Création de la session Stripe
   - Retour de l'URL de paiement

2. **Paiement** :
   - L'utilisateur est redirigé vers Stripe
   - Il paie avec sa carte
   - Stripe traite le paiement

3. **Webhook** :
   ```
   Stripe → POST /api/checkout/webhook
   ```
   - Vérification de la signature Stripe
   - Vérification du stock (double vérification)
   - Décrémentation atomique du stock
   - Création de la commande en DB
   - Envoi de confirmation (optionnel)

### Sécurité des Paiements

- **Validation du stock** : Avant création de session ET dans le webhook
- **Validation des prix** : Les prix sont relus depuis la DB dans le webhook
- **Transactions atomiques** : Utilisation de Prisma transactions
- **Signature Stripe** : Vérification de la signature du webhook
- **URLs de redirection** : Validation des domaines autorisés

---

## 🔄 Flux de Données

### Exemple : Achat d'un Produit

```
1. Frontend → GET /api/products/display-pikachu
   └─► Backend → Prisma → SQLite
   └─► Retourne les détails du produit avec stock

2. Frontend → POST /api/checkout/create-session
   └─► Backend vérifie :
       ├─► Stock disponible
       ├─► Quantités valides
       ├─► Prix corrects
   └─► Crée session Stripe
   └─► Retourne URL de paiement

3. Utilisateur → Stripe (paiement)
   └─► Stripe traite le paiement

4. Stripe → POST /api/checkout/webhook
   └─► Backend vérifie :
       ├─► Signature Stripe valide
       ├─► Stock toujours disponible
       ├─► Prix toujours corrects
   └─► Transaction atomique :
       ├─► Décrémente le stock
       ├─► Crée la commande
       └─► Crée les OrderItems

5. Frontend → GET /api/users/orders
   └─► Backend → Prisma → SQLite
   └─► Retourne les commandes de l'utilisateur
```

### Cache

Le backend utilise un cache en mémoire pour :
- Les séries de cartes (`/api/trade/sets`)
- Les cartes d'une série (`/api/trade/sets/:id/cards`)

**TTL** : 60 secondes (configurable via `CACHE_TTL_MS`)

---

## 🔧 Configuration

### Variables d'Environnement

```env
# Base de données
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="votre-secret-très-long"
JWT_REFRESH_SECRET="votre-secret-refresh-très-long"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Serveur
PORT=8080
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173,https://boulevardtcg.com"
ALLOWED_REDIRECT_DOMAINS="http://localhost:5173,https://boulevardtcg.com"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CHECKOUT_SUCCESS_URL="http://localhost:5173/checkout/success"
CHECKOUT_CANCEL_URL="http://localhost:5173/panier"
```

---

## 📊 Gestion des Erreurs

### Codes d'Erreur HTTP

- **200** : Succès
- **201** : Créé
- **400** : Requête invalide
- **401** : Non authentifié
- **403** : Non autorisé
- **404** : Non trouvé
- **409** : Conflit (stock insuffisant, etc.)
- **500** : Erreur serveur

### Format des Erreurs

```json
{
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": [...] // Optionnel, uniquement en développement
}
```

---

## 🚨 Gestion du Stock

### Double Vérification

1. **Avant création de session Stripe** :
   - Vérifie le stock disponible
   - Vérifie les quantités demandées
   - Refuse si stock insuffisant

2. **Dans le webhook Stripe** :
   - Re-vérifie le stock (peut avoir changé)
   - Décrémente atomiquement avec Prisma transaction
   - Si stock insuffisant, la transaction échoue

### Décrémentation Atomique

```typescript
await tx.productVariant.updateMany({
  where: {
    id: variant.id,
    stock: { gte: item.quantity } // Condition : stock >= quantité
  },
  data: {
    stock: { decrement: item.quantity }
  }
})
```

Si `updated.count === 0`, cela signifie que le stock était insuffisant.

---

## 🔍 Debugging

### Logs

Le backend log :
- Les requêtes (méthode, URL, origine)
- Les erreurs (stack trace en développement)
- Les opérations importantes (création de commandes, etc.)

### Mode Développement

En développement (`NODE_ENV=development`) :
- Logs détaillés
- Détails des erreurs dans les réponses
- CORS plus permissif (localhost autorisé)

---

## 📝 Exemples d'Utilisation

### Exemple 1 : Récupérer un produit

```bash
curl http://localhost:8080/api/products/display-pikachu-led-premium
```

### Exemple 2 : Créer une session de paiement

```bash
curl -X POST http://localhost:8080/api/checkout/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variantId": "variant123",
        "quantity": 1
      }
    ],
    "customerEmail": "user@example.com"
  }'
```

### Exemple 3 : Connexion

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-secure-password"
  }'
```

### Exemple 4 : Récupérer le profil (authentifié)

```bash
curl http://localhost:8080/api/users/profile \
  -H "Authorization: Bearer <accessToken>"
```

---

## 🎯 Points Clés à Retenir

1. **Sécurité** : Toutes les routes sont protégées et validées
2. **Stock** : Double vérification avant et après paiement
3. **Prix** : Revalidés depuis la DB dans le webhook
4. **Transactions** : Utilisation de transactions atomiques pour la cohérence
5. **Tokens** : JWT avec refresh tokens pour la sécurité
6. **Validation** : Toutes les données sont validées et sanitizées
7. **Cache** : Cache en mémoire pour les données externes (TCGdx)
8. **Rate Limiting** : Protection contre les abus

---

## 🚀 Prochaines Étapes

Pour aller plus loin :
1. Ajouter des tests unitaires et d'intégration
2. Implémenter un système de logs structuré (Winston, Pino)
3. Ajouter un monitoring (Sentry, Datadog)
4. Mettre en place des backups automatiques
5. Ajouter une API de gestion admin
6. Implémenter un système de notifications
7. Ajouter un système de recherche avancée
8. Optimiser les requêtes avec des index de base de données

---

**Documentation créée le :** 2025-01-09
**Version :** 1.0.0

