# BoulevardTCG / pok-card

Application e-commerce complète (frontend + backend) pour vendre des produits TCG.

- **Frontend** : catalogue, fiche produit, panier/checkout Stripe, compte client, suivi de commande, page contact.
- **Backend** : API Express (auth, produits, commandes, admin, checkout Stripe, emails SMTP, contact).

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
- `pokecard/server/` : backend **Node + Express + Prisma**

## URLs en dev (par défaut)

- **Frontend** : `http://localhost:5173`
- **API** : `http://localhost:8080/api`

## Fonctionnalités principales

### Côté client

- Catalogue produits + recherche
- Fiche produit (variants/stock)
- Panier
- Checkout Stripe
- Détail commande + **suivi colis** (transporteur, numéro, lien de tracking quand expédiée)
- Page **Contact** (`/contact`) avec envoi via API

### Côté admin

- Liste/gestion des commandes
- Affichage des adresses de livraison
- Marquer une commande **expédiée** / **livrée** + transporteur / numéro de suivi

## Démarrage rapide (dev)

### Prérequis

- Node.js **18+**
- npm

### 1) Installer les dépendances

```bash
npm --prefix pokecard install
npm --prefix pokecard/server install
```

### 2) Configurer l’environnement (backend)

Crée `pokecard/server/.env` (ne pas commiter).
Tu peux partir de `pokecard/server/ENV_EXAMPLE.txt`.

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
npx --prefix pokecard/server prisma generate
npx --prefix pokecard/server prisma db push
# optionnel
npm --prefix pokecard/server run seed
```

### 4) Lancer le backend

```bash
npm --prefix pokecard/server run dev
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

### Backend (`pokecard/server/`)

```bash
npm --prefix pokecard/server run dev
npm --prefix pokecard/server run build
npm --prefix pokecard/server start
npm --prefix pokecard/server test
npm --prefix pokecard/server run seed
```

## Tests

Les tests backend sont sous `pokecard/server/src/__tests__/`.

- Ils tournent en série (`--runInBand`) pour éviter les conflits DB.
- Les tests exigent une DB dédiée (`TEST_DATABASE_URL`) pour éviter toute suppression accidentelle.

## Sécurité / bonnes pratiques

- Ne commit jamais de `.env`, clés Stripe, mots de passe SMTP.
- Script de scan basique:

```bash
node pokecard/server/scripts/scan-secrets.mjs
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
npx --prefix pokecard/server prisma generate
npx --prefix pokecard/server prisma db push
```

### Contact / emails

- Vérifie `SMTP_HOST/USER/PASS` et `EMAIL_FROM` (doit souvent être un sender autorisé).
- En dev sans SMTP, les emails peuvent être envoyés en stream (selon config).

---

## Docs complémentaires

- Backend: `pokecard/server/README.md`
- Contact flow: `pokecard/server/CONTACT_FLOW.md`
