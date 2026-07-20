# Passation — BoulevardTCG

> Document de reprise pour une nouvelle session Claude Code (ou un nouveau dev).
> Dernière mise à jour : **2026-07-20**.
> À lire avec `CLAUDE.md` (racine), qui couvre les commandes et l'architecture générale.

---

## 1. Où en est le projet

Plateforme e-commerce TCG (monolithe modulaire) : boutique React + API Express + PostgreSQL, plus une app Marketplace séparée.

**Le gros chantier récent, et le seul non trivial en cours : l'intégration de livraison Boxtal (API v3).** Elle a été mergée dans `main` le 2026-07-20. Elle est fonctionnellement complète pour le parcours nominal, mais comporte des angles morts documentés en §5 — c'est la section à lire avant d'y toucher.

État des suites de tests au moment du merge : **416 tests backend au vert** (26 fichiers), build front OK.

---

## 2. Rappels d'environnement (les pièges qui font perdre du temps)

- **Monorepo sans workspaces.** Ne jamais lancer `npm install` à la racine. Toujours `npm --prefix server ...` / `npm --prefix pokecard ...`.
- **Node >= 24** pour les deux projets.
- **Prisma : `migrate dev` veut reset la base de dev.** Ne pas l'utiliser. Écrire la migration SQL à la main dans `server/prisma/migrations/<timestamp>_<nom>/migration.sql`, puis `migrate deploy`. C'est ce qui a été fait pour Boxtal.
- **Base de test sur le port 5434** (la base de dev est sur 5432).
- **Marketplace** : `marketplace/server/.env` doit avoir le **même `JWT_SECRET`** que `server/.env`, sinon 401 systématique — les tokens sont émis par la Boutique et vérifiés par le Marketplace.
- **Prod = Vercel (front) + Railway (back).** `api.boulevardtcg.com` n'existe pas ; le front tape l'URL Railway via `VITE_API_URL` (injecté au build).

### Piège structurel important
`server/src/app.ts` **et** `server/src/index.ts` déclarent chacun leurs routes, indépendamment. `app.ts` est utilisé par les tests, `index.ts` par le runtime. **Toute nouvelle route doit être ajoutée aux deux fichiers**, sinon elle passe les tests et n'existe pas en production (ou l'inverse). C'est la source de bug la plus facile à introduire dans ce repo.

---

## 3. Authentification (inchangé, mais souvent mal réimplémenté)

- Access token : `localStorage` (`accessToken`), 15 min.
- Refresh token : **cookie httpOnly** (`refreshToken`), path `/api/auth`, 7 jours.
- Côté boutique, le refresh token n'est **jamais** dans le JSON de réponse ni dans `localStorage`. Ne pas « simplifier » ça : c'était une correction de sécurité (C1).
- `/api/auth/refresh` lit le cookie en priorité, avec un repli sur le body **uniquement pour compatibilité Marketplace** (dont le front stocke le token autrement). Ne pas retirer ce repli.

---

## 4. L'intégration Boxtal — ce qu'il faut savoir

### 4.1 Activation

Tout est piloté par `BOXTAL_ACCESS_KEY` + `BOXTAL_SECRET_KEY`. Si l'une manque, `getBoxtalConfig()` (`server/src/config/boxtal.ts:101`) renvoie `null` et la fonctionnalité se désactive proprement (503 `BOXTAL_NOT_CONFIGURED`). `validateEnv` vérifie seulement que les deux sont présentes **ou** absentes ensemble.

Attention : **`validateEnv` ne valide rien d'autre.** Des clés API sans codes d'offre, sans expéditeur ou sans secret webhook démarrent sans le moindre avertissement, et l'échec ne se manifeste qu'au premier clic admin. Variables complètes documentées dans `server/env.example:60-95`.

Les 8 variables `BOXTAL_SHIPPER_*` (company, first name, last name, email, phone, address, postal code, city) sont **requises ensemble** : `buildShipper()` renvoie `null` si une seule manque.

Par défaut `BOXTAL_API_BASE_URL` pointe l'environnement de **test** (`https://api.boxtal.build`). À basculer explicitement pour la prod.

Aucune variable `BOXTAL_*` n'est dans `docker-compose.yml` — elles transitent par `server/.env`.

### 4.2 Routes

| Méthode + chemin | Auth | Rôle |
|---|---|---|
| `GET /api/shipping/methods` | publique | Modes de livraison (voir §5, actuellement non consommé par le front) |
| `GET /api/shipping/parcel-points` | publique, 20 req/min/IP | Proxy de recherche de points relais — les clés Boxtal ne sortent jamais du serveur |
| `POST /api/shipping/boxtal/webhook` | signature HMAC | `TRACKING_CHANGED` / `DOCUMENT_CREATED` |
| `POST /api/admin/orders/:orderId/boxtal-shipment` | admin | Création d'étiquette, ou resynchronisation si déjà créée |

Le webhook est monté **avant `express.json()`** (corps brut nécessaire au HMAC) et **exempté du rate-limit global**.

### 4.3 Schéma

`Order` gagne 4 colonnes nullables (migration `20260715120000_add_boxtal_shipping_fields`) :
`boxtalShippingOrderId String? @unique`, `labelUrl String?`, `pickupPointCode String?`, `pickupPoint Json?`.

Pas de nouvel enum : `FulfillmentStatus.PREPARING` et `OrderEventType.PREPARING` existaient déjà.

### 4.4 Flux

1. **Panier** — `ParcelPointSelector` s'affiche si le mode a `requiresPickupPoint`. Recherche auto dès 4 caractères de code postal. Le choix bloque la validation s'il manque.
2. **Checkout** — le point relais est normalisé côté serveur (`validators/pickupPoint.ts`) puis sérialisé en **métadonnées Stripe**. Le code relais n'est **pas** revalidé auprès de Boxtal à ce stade (choix assumé, commenté dans le fichier).
3. **Commande** — les métadonnées Stripe sont relues au webhook/retour de session et remplissent `pickupPointCode` + `pickupPoint`.
4. **Étiquette (admin)** — bouton « Expédier via Boxtal ». L'id Boxtal est **persisté immédiatement** après création (garde anti-double-étiquette), puis suivi et étiquette sont récupérés en best-effort. La commande passe en `PREPARING`. **Aucun email n'est envoyé à cette étape.**
5. **Tracking** — `services/fulfillment.ts` mappe les statuts Boxtal → `SHIPPED` / `DELIVERED` et déclenche les emails. Idempotent (gardes `alreadyShipped` / `alreadyDelivered`).
6. **Webhook** — lookup par `boxtalShippingOrderId`, repli sur `shipmentExternalId`. Commande inconnue → **200** volontairement, pour éviter les rejeux en boucle.

### 4.5 Sécurité du webhook

En-tête `x-bxt-signature` = HMAC-SHA256 du corps brut avec `BOXTAL_WEBHOOK_SECRET`. Comparaison **timing-safe**, acceptant hex **ou** base64 (Boxtal ne documente pas l'encodage). Pas de signature → 401 ; pas de secret configuré → 503.

Pas de protection anti-rejeu (ni timestamp, ni déduplication sur l'id d'événement). Les handlers étant idempotents, le cas fonctionnel est couvert ; un rejeu malveillant d'un événement capturé ne l'est pas.

### 4.6 Smoke test

```bash
cd server && npx tsx scripts/boxtal-smoke.mts
```
Aucun script npm n'a été ajouté pour ce fichier. Le script a un garde-fou production : il refuse toute base d'API ne contenant pas `boxtal.build`, sauf `--allow-prod`. Il enchaîne recherche de relais → création d'expédition → suivi/étiquette → annulation, en exerçant le vrai code du service.

---

## 5. Dette connue sur Boxtal — à lire avant d'intervenir

Ces points sont **connus et assumés à ce stade**, pas des oublis. Ils sont classés par risque réel.

### Impact client direct
1. **Repli téléphone dangereux** — si le client n'a pas de téléphone, c'est **celui de la boutique** qui part chez Boxtal comme contact destinataire (`services/boxtal.ts:372`). Les SMS de mise à disposition du transporteur arriveront donc à la boutique, et le client ne sera pas prévenu. À corriger en priorité si le téléphone n'est pas obligatoire au checkout.
2. **`splitFullName` invente un nom de famille** — un client dont le nom tient en un mot part en `{ firstName: <mot>, lastName: 'BoulevardTCG' }` (`services/boxtal.ts:250`). Le nom de la boutique s'imprime sur l'étiquette du client.
3. **`normalizeCountryIso2` tronque silencieusement** — un pays inconnu est réduit à ses 2 premières lettres. « ROYAUME-UNI » devient `RO`, soit la Roumanie (`services/boxtal.ts:295`).
4. **`labelUrl` expire au bout de 7 jours** côté Boxtal, et rien ne la rafraîchit. Le lien « Étiquette PDF » de l'admin finit par renvoyer une erreur, sans message explicatif.

### Coût / facturation
5. **Le poids est entièrement estimé** : `150 g + 50 g × nombre d'articles`. Aucun poids réel par produit, ni en base ni au schéma. Les écarts de poids sont refacturés par le transporteur.
6. **Dimensions de colis uniques** (24×18×8 cm) quelle que soit la commande.
7. **Le coût réel d'expédition n'est jamais remonté** — `GET /shipping-order/{id}` n'est pas implémenté.

### Exploitation
8. **Aucune souscription webhook programmatique.** L'enregistrement des événements `DOCUMENT_CREATED` / `TRACKING_CHANGED` chez Boxtal se fait **à la main**, et le secret généré doit être recopié dans `BOXTAL_WEBHOOK_SECRET`. C'est une étape de déploiement facile à oublier — sans elle, aucun suivi ne remonte.
9. **`cancelShippingOrder()` existe mais n'est exposée nulle part** (ni route, ni bouton). Annuler une étiquette créée par erreur impose de passer par l'espace Boxtal.
10. **Statuts `RETURNED` / `EXCEPTION` ignorés en silence**, sans même un log (`services/boxtal.ts:534`). Un colis retourné ne laisse aucune trace applicative.
11. **Aucune resynchronisation planifiée.** Si le webhook tombe, le seul rattrapage est un clic admin, commande par commande.

### Cohérence
12. **Les tarifs de livraison sont dupliqués** entre `pokecard/src/shippingMethods.ts` (en dur) et `server/src/config/shipping.ts`. `GET /api/shipping/methods` a été créé comme source de vérité serveur mais **n'est appelé par aucun code front** — l'endpoint est mort et les deux listes peuvent diverger silencieusement.
13. **Fuite mineure** : `GET /api/users/orders` et `/users/orders/:id` renvoient l'objet `Order` complet sans `select`, donc `labelUrl` et `boxtalShippingOrderId` sont exposés au client final.

### Couverture de tests
Bonne sur le backend (36 tests dédiés Boxtal : config, normalisation, signature HMAC, routes, webhook, endpoint admin). **Non couverts** : `services/fulfillment.ts` en direct, l'assertion « pas de second email » sur l'idempotence, `cancelShippingOrder`, les timeouts/`BOXTAL_UNREACHABLE`, et **tout le front** (aucun test front n'existe dans ce projet).

---

## 6. Sécurité — corrections déjà appliquées, à ne pas défaire

- **C1** — suppression du refresh token de `localStorage`, `credentials: 'include'` sur refresh/logout.
- **H1** — rate limiting dédié 2FA (5 tentatives / 15 min / email).
- **H3** — incrément de code promo **atomique** (`updateMany` conditionné sur `usedCount < usageLimit`). Ne pas revenir à un `update` simple : c'était une race condition exploitable.
- **H4** — `Order.stripeSessionId @unique` + idempotence du webhook Stripe dans une transaction, avec `catch` du code Prisma `P2002`.
- Audit 2026-06 : CVE corrigées, XSS JSON-LD corrigé. La montée vers Vite 8 a été **volontairement différée** (les vulnérabilités restantes sont dev-only).

---

## 7. RGPD / analytics

GA4 `G-48XSD96XGF`. Le script n'est chargé **qu'après consentement**, via Google Tag Manager. Les `page_view` sont envoyés manuellement (SPA). L'event `purchase` est envoyé **côté serveur** via Measurement Protocol, depuis le webhook Stripe **et** depuis `verify-session`. Attention en cas de modification : le risque est le double comptage.

---

## 8. État Git au moment de la passation

- Branche de travail Boxtal : `feat/boxtal-shipping`, **mergée dans `main`**.
- **4 PRs restent ouvertes, toutes datées de janvier 2026** (~6 mois) et volontairement **non mergées** :
  - **#93** — mise à jour de dépendances (sécurité). **En conflit** avec `main`.
  - **#83** — système de réservation de panier. **+3014/-224 sur 26 fichiers.**
  - **#60** — modifications de textes (+41/-33).
  - **#57** — refonte de textes landing (+10/-14).

  Elles n'ont jamais vu les changements Boxtal, CSP, GA4 ni eBay. **Ne pas les merger sans relecture** : #83 en particulier touche la gestion de stock, qui interagit directement avec le checkout modifié depuis. Le plus sain est probablement de les fermer et de réextraire ce qui vaut encore la peine.
- Le repo compte beaucoup de branches locales anciennes déjà mergées — un nettoyage serait bienvenu.
- `.claude/` et `_bmad/` sont des dossiers d'outillage local, désormais dans `.gitignore`.

---

## 9. Ce que je ferais en priorité

1. **Corriger le repli téléphone (§5.1)** — c'est le seul point qui casse silencieusement l'expérience client en production.
2. **Rendre le téléphone obligatoire au checkout**, ce qui règle le §5.1 à la racine.
3. **Corriger `splitFullName` et `normalizeCountryIso2`** — deux bugs de données à faible effort, visibles sur l'étiquette.
4. **Documenter (ou automatiser) la souscription webhook Boxtal** — sans elle, le suivi ne remonte pas et rien ne le signale.
5. **Trancher sur les 4 vieilles PRs** — les fermer ou les rebaser, mais ne pas les laisser pourrir.
6. **Brancher le front sur `GET /api/shipping/methods`** ou supprimer l'endpoint, pour lever la duplication des tarifs.
