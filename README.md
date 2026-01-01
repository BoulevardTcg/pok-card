# BoulevardTCG / pok-card

Application e-commerce complète (frontend + backend) pour vendre des produits TCG.

- **Frontend** : catalogue, fiche produit, panier/checkout Stripe, compte client, suivi de commande, page contact.
- **Backend** : API Express (auth, produits, commandes, admin, checkout Stripe, emails SMTP, contact).

## 💼 Présentation Commerciale

**BoulevardTCG** est une solution e-commerce complète et production-ready, développée avec les technologies modernes (React 19, Node.js, TypeScript). Le projet représente **300-500 heures de développement** et une valeur estimée de **15 000€ - 40 000€**.

### Points Forts

- ✅ **Application complète** : frontend React + backend Express avec toutes les fonctionnalités essentielles
- ✅ **Code professionnel** : TypeScript, architecture modulaire, tests inclus
- ✅ **Sécurité robuste** : authentification JWT, 2FA, rate limiting, validation stricte
- ✅ **Prêt pour production** : Docker configuré, documentation complète
- ✅ **E-commerce complet** : produits, panier, paiement Stripe, gestion commandes, panel admin
- ✅ **Fonctionnalités TCG** : échanges, collection personnelle, concours

📄 Pour plus de détails commerciaux, consultez [PRESENTATION_COMMERCIALE.md](./pokecard/PRESENTATION_COMMERCIALE.md)  
📋 Liste complète des fonctionnalités : [FEATURES.md](./pokecard/FEATURES.md)

---

## Présentation du projet

L’objectif de ce repo est de fournir une base **e-commerce réaliste** pour une boutique TCG, avec un périmètre complet :

- **Vente** : catalogue → panier → paiement Stripe
- **Commande** : création/stockage côté backend (via webhook Stripe) + consultation côté client
- **Expédition** : workflow simple (admin) avec statut, transporteur, numéro et lien de suivi
- **Support** : page Contact avec anti-spam et envoi d’emails via SMTP

Le projet est volontairement pragmatique : une API REST Express + Prisma, et un front React/Vite.

## Parcours “end-to-end” (ce qui se passe réellement)

### Acheter un produit

1. Le client ajoute des articles au panier côté frontend.
2. Le frontend appelle `POST /api/checkout/create-session`.
3. Le backend calcule le total, prépare les `line_items` (produits + livraison), puis crée une session Stripe Checkout.
4. Stripe redirige le client vers la page de paiement.
5. Stripe appelle le webhook `POST /api/checkout/webhook` après paiement.
6. Le backend vérifie la signature, puis persiste la commande (items, adresse, livraison, etc.) et déclenche les emails transactionnels.

### Expédier / livrer une commande

1. Un admin marque la commande expédiée (transporteur + tracking).
2. Le backend enregistre un événement de commande et envoie l’email d’expédition (avec lien de suivi).
3. Le client voit les infos de suivi dans le détail de commande lorsque `fulfillmentStatus` est `SHIPPED`.

### Contacter le support

1. Le client utilise `/contact`.
2. Le frontend appelle `POST /api/contact`.
3. Le backend valide strictement, applique rate limit + honeypot, envoie l’email au support et un accusé de réception (si activé).

## Structure du repo

- `pokecard/` : frontend **React + Vite + TypeScript**
- `server/` : backend **Node + Express + Prisma**

## URLs en dev (par défaut)

- **Frontend** : `http://localhost:5173`
- **API** : `http://localhost:8080/api`

## Fonctionnalités principales

### 🛍️ Côté client

- ✅ Catalogue produits avec recherche, filtres et pagination
- ✅ Fiche produit détaillée avec variantes (langue, édition)
- ✅ Panier avec gestion des quantités
- ✅ Checkout Stripe intégré et sécurisé
- ✅ Espace client avec historique des commandes
- ✅ Détail commande + **suivi colis** (transporteur, numéro, lien de tracking)
- ✅ Page **Contact** (`/contact`) avec protection anti-spam
- ✅ Collection personnelle de cartes
- ✅ Système d'échange entre collectionneurs
- ✅ Authentification JWT avec 2FA

### 🔐 Côté admin

- ✅ Dashboard avec statistiques et métriques
- ✅ Gestion complète des produits (CRUD)
- ✅ Gestion du stock avec alertes visuelles
- ✅ Liste/gestion des commandes avec filtres
- ✅ Affichage des adresses de livraison
- ✅ Marquer une commande **expédiée** / **livrée** + transporteur / numéro de suivi
- ✅ Gestion des utilisateurs
- ✅ Codes promo avec règles avancées
- ✅ Modération des avis clients
- ✅ Rapports et statistiques

> 📋 **Liste complète** : Voir [FEATURES.md](./pokecard/FEATURES.md) pour toutes les fonctionnalités détaillées

## Démarrage rapide (dev)

### Prérequis

- Node.js **18+**
- npm

### 1) Installer les dépendances

```bash
npm --prefix pokecard install
npm --prefix server install
```

### 2) Configurer l’environnement (backend)

Crée `server/.env` (ne pas commiter).
Tu peux partir de `server/ENV_EXAMPLE.txt`.

Variables **courantes** (extraits, sans valeurs):

- **Serveur**: `PORT`, `FRONTEND_URL`, `CORS_ORIGIN`
- **Auth**: `JWT_SECRET`, `JWT_REFRESH_SECRET`
- **DB**: `DATABASE_URL`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Email SMTP**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SHOP_EMAIL`, `EMAIL_FROM`
- **Contact**: `CONTACT_TO_EMAIL`, `CONTACT_AUTOREPLY_ENABLED`

> Important: en production, les secrets doivent être forts (et jamais en dur). Le backend fail-fast sur certaines variables critiques.

### 3) Base de données (Prisma)

```bash
npx --prefix server prisma generate
npx --prefix server prisma db push
# optionnel
npm --prefix server run seed
```

### 4) Lancer le backend

```bash
npm --prefix server run dev
```

### 5) Lancer le frontend

```bash
npm --prefix pokecard run dev
```

## Scripts

### Frontend (`pokecard/`)

```bash
npm --prefix pokecard run dev
npm --prefix pokecard run build
npm --prefix pokecard run preview
npm --prefix pokecard run lint
```

### Backend (`server/`)

```bash
npm --prefix server run dev
npm --prefix server run build
npm --prefix server start
npm --prefix server test
npm --prefix server run seed
```

## Tests

Les tests backend sont sous `server/src/__tests__/`.

- Ils tournent en série (`--runInBand`) pour éviter les conflits DB.
- Les tests exigent une DB dédiée (`TEST_DATABASE_URL`) pour éviter toute suppression accidentelle.

## Sécurité / bonnes pratiques

- Ne commit jamais de `.env`, clés Stripe, mots de passe SMTP.
- Script de scan basique:

```bash
node server/scripts/scan-secrets.mjs
```

- Endpoint contact protégé (honeypot + rate limit).
- DTO “safe” quand une commande est consultée via token public (minimisation PII).

## Notes d’architecture (rapide)

- **Checkout**: création de session Stripe côté backend, puis webhook Stripe pour persister/synchroniser la commande.
- **Expédition/livraison**: statut de fulfillment + événements de commande + tracking (lien transporteur).
- **Emails**: envoi SMTP via `nodemailer` (templates HTML côté backend).

## Troubleshooting

### Port 8080 déjà utilisé (`EADDRINUSE`)

```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Prisma / schema pas à jour

```bash
npx --prefix server prisma generate
npx --prefix server prisma db push
```

## Monorepo sans workspaces (important)

- Ne lancez pas `npm i` à la racine du repo. Installez dans chaque app:
  - Frontend: `npm --prefix pokecard i` (ou `ci` en CI)
  - Backend: `npm --prefix server i` (ou `ci` en CI)
- Des scripts pratiques existent à la racine:
  - `npm run dev:front`, `npm run dev:back`
  - `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run build`
- Les hooks Git (pre-commit) restent à la racine et déclenchent le lint/format dans chaque dossier via `npm --prefix`.
- La CI (GitHub Actions) installe déjà séparément dans `pokecard/` et `server/` avec `npm ci`.

### Contact / emails

- Vérifie `SMTP_HOST/USER/PASS` et `EMAIL_FROM` (doit souvent être un sender autorisé).
- En dev sans SMTP, les emails peuvent être envoyés en stream (selon config).

---

## 📚 Documentation Complémentaire

### Documentation Technique
- Backend: `pokecard/server/README.md`
- Contact flow: `pokecard/server/CONTACT_FLOW.md`
- Intégration Stripe: `pokecard/STRIPE_INTEGRATION.md`

### Documentation Commerciale
- **Présentation commerciale** : [PRESENTATION_COMMERCIALE.md](./pokecard/PRESENTATION_COMMERCIALE.md)
- **Liste des fonctionnalités** : [FEATURES.md](./pokecard/FEATURES.md)
