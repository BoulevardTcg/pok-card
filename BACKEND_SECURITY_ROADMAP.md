# 🔒 Backend Security & Product Management Roadmap

## Rôle

Lead Backend Engineer + Security Engineer (Node.js/TypeScript) spécialisé en Prisma + PostgreSQL, avec une approche "secure-by-default".

---

## Contexte

Dans notre repo, le fichier `server/prisma/seed.ts` est actuellement versionné et contient des informations sensibles (ex: logs/identifiants admin). C'est un risque de sécurité + une mauvaise pratique. De plus, le mécanisme actuel de seeding / population des tables produits n'est pas satisfaisant côté sécurité et maintenabilité.

---

## Objectifs

1. **Supprimer tout secret / donnée sensible du dépôt** et empêcher que cela revienne.
2. **Repenser la stratégie de "population produits"** pour qu'elle soit robuste, maintenable, et sécurisée.
3. **Mettre en place une gestion des produits via backend + espace admin sécurisé** (CRUD produits), accessible uniquement aux admins authentifiés/autorisés.
4. **Conformité RGPD** : implémenter les droits des utilisateurs sur leurs données personnelles.

---

## Exigences Sécurité Techniques

- [x] Aucun identifiant/log admin ne doit être commité ✅
- [x] Ajouter des garde-fous : `.gitignore`, pré-commit, et/ou CI check ✅
- [x] Utiliser des variables d'environnement (dotenv) ✅
- [x] Mise en place d'une auth + RBAC (rôles) pour l'espace admin ✅
- [x] Middleware de sécurité (auth, role check, rate-limit) ✅
- [x] Validation des inputs (zod) ✅
- [x] Audit minimal : journaliser les actions admin ✅
- [x] Helmet (CSP, HSTS, noSniff) ✅
- [x] CORS configuré ✅
- [x] Protection XSS/SQL injection ✅
- [x] Mots de passe hashés (bcrypt 12 rounds) ✅

---

## 🇪🇺 Conformité RGPD (Règlement Général sur la Protection des Données)

### Statut Actuel

| Exigence RGPD | Statut | Priorité |
|---------------|--------|----------|
| Chiffrement mots de passe | ✅ OK | - |
| Accès aux données (Art. 15) | ⚠️ Partiel | 🔴 Haute |
| Rectification (Art. 16) | ✅ OK | - |
| Effacement / Droit à l'oubli (Art. 17) | ❌ Manquant | 🔴 Critique |
| Portabilité des données (Art. 20) | ❌ Manquant | 🔴 Haute |
| Consentement explicite (Art. 7) | ❌ Manquant | 🟠 Moyenne |
| Minimisation des données (Art. 5) | ⚠️ À vérifier | 🟡 Basse |
| Rétention limitée (Art. 5) | ❌ Manquant | 🟠 Moyenne |

### Actions Requises

#### 1. 🔴 Droit à l'effacement (Art. 17) - CRITIQUE

**Route à créer** : `DELETE /api/users/me`

L'utilisateur doit pouvoir supprimer son compte et toutes ses données personnelles.

```typescript
// Données à supprimer :
- User (email, username, password, nom, prénom)
- UserProfile (téléphone, adresse, date de naissance)
- RefreshTokens
- Favorites
- Reviews (ou anonymiser)
- TradeOffers (ou anonymiser)

// Données à CONSERVER (obligation légale - factures) :
- Orders → anonymiser (remplacer userId par null, conserver pour comptabilité)
```

**Implémentation recommandée** :
- Demander confirmation par mot de passe
- Envoyer un email de confirmation avant suppression (délai 48h)
- Soft delete optionnel (marquer comme supprimé, purge après 30 jours)

#### 2. 🔴 Droit à la portabilité (Art. 20) - HAUTE

**Route à créer** : `GET /api/users/me/export`

L'utilisateur doit pouvoir télécharger toutes ses données dans un format lisible (JSON/CSV).

```typescript
// Données à exporter :
{
  "user": { email, username, firstName, lastName, createdAt },
  "profile": { phone, address, city, postalCode, country, birthDate },
  "orders": [...],
  "favorites": [...],
  "reviews": [...],
  "tradeOffers": [...]
}
```

#### 3. 🟠 Gestion du consentement (Art. 7)

**Champs à ajouter au modèle User** :
```prisma
model User {
  // ... champs existants
  marketingConsent     Boolean   @default(false)
  marketingConsentAt   DateTime?
  analyticsConsent     Boolean   @default(false)
  analyticsConsentAt   DateTime?
  privacyPolicyVersion String?   // Version acceptée
  privacyAcceptedAt    DateTime?
}
```

**Routes à créer** :
- `PUT /api/users/me/consent` - Mettre à jour les consentements
- `GET /api/users/me/consent` - Récupérer l'état des consentements

#### 4. 🟠 Politique de rétention des données

**Données à purger automatiquement** :
| Donnée | Rétention | Action |
|--------|-----------|--------|
| RefreshTokens expirés | 0 jours | Supprimer |
| Comptes non vérifiés | 30 jours | Supprimer |
| Paniers abandonnés | 90 jours | Supprimer |
| Logs de connexion | 1 an | Supprimer |
| Commandes | 10 ans | Conserver (obligation légale) |

**Script CRON recommandé** : `npm run cleanup:gdpr`

#### 5. 🟡 Minimisation des données

- Ne collecter que les données strictement nécessaires
- Vérifier que les logs ne contiennent pas de données personnelles
- Anonymiser les données utilisées pour les statistiques

### Checklist Implémentation RGPD

```
Phase 1 - Critique (avant mise en production)
[x] Implémenter DELETE /api/gdpr/delete-now (suppression compte) ✅
[x] Implémenter GET /api/gdpr/export (export données) ✅
[ ] Ajouter page "Politique de confidentialité" (frontend)
[ ] Ajouter page "Mentions légales" (frontend)

Phase 2 - Important
[x] Ajouter champs consentement au modèle User ✅
[x] Implémenter routes de gestion du consentement ✅
[ ] Checkbox consentement sur formulaire d'inscription (frontend)
[x] Script de purge des données périmées ✅

Phase 3 - Amélioration continue
[ ] Audit des logs (pas de données personnelles)
[ ] Documentation du traitement des données (registre RGPD)
[ ] Procédure de notification en cas de fuite de données
```

### Routes RGPD Implémentées

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/gdpr/export` | GET | Export de toutes les données personnelles (JSON) |
| `/api/gdpr/delete-request` | POST | Demande de suppression (délai 30 jours) |
| `/api/gdpr/cancel-delete` | POST | Annulation d'une demande de suppression |
| `/api/gdpr/delete-now` | DELETE | Suppression immédiate du compte |
| `/api/gdpr/consent` | GET | État des consentements |
| `/api/gdpr/consent` | PUT | Mise à jour des consentements |
| `/api/gdpr/deletion-status` | GET | Statut d'une demande de suppression |

### Scripts RGPD

- `npm run gdpr:cleanup` : Purge des données périmées (à exécuter quotidiennement)

---

---

## Livrables Attendus

### A) Sécurisation Repo ✅ COMPLÉTÉ

**Objectif** : Retirer les secrets de `server/prisma/seed.ts`

**Solution appliquée** :
- [x] `seed.ts` refactorisé pour utiliser les variables d'environnement
- [x] `seed.example.ts` créé comme template
- [x] `.gitignore` mis à jour
- [x] `env.example` complété avec les variables SEED_*
- [x] Script `scan:secrets` ajouté pour détecter les secrets

**Fichiers modifiés** :
- `server/prisma/seed.ts` → utilise `process.env.SEED_*`
- `server/prisma/seed.example.ts` → template sans secrets
- `server/env.example` → documentation des variables
- `server/scripts/scan-secrets.mjs` → détection améliorée

---

### B) Nouvelle Stratégie de Population Produits ✅ EN PLACE

**Approche retenue** : Backoffice admin (CRUD) + seeding dev sécurisé

| Approche | Description | Statut |
|----------|-------------|--------|
| **Seeding sécurisé** | Via variables d'environnement | ✅ OK |
| **Backoffice admin** | CRUD via routes `/admin/*` | ✅ OK |

---

### C) Implémentation Backend CRUD Produits Sécurisé ✅ COMPLÉTÉ

#### Routes REST existantes
```
POST   /admin/products         → Créer un produit ✅
PATCH  /admin/products/:id     → Modifier un produit ✅
DELETE /admin/products/:id     → Supprimer un produit ✅
GET    /admin/products         → Liste + filtres + pagination ✅
```

#### Middlewares appliqués
- [x] `authenticateToken` → Vérifie JWT
- [x] `requireAdmin` → Vérifie le rôle admin
- [x] Rate limiting (lecture: 100/min, écriture: 30/min, suppression: 10/min)
- [x] Audit logging sur création/suppression

#### Validation
- [x] Schemas Zod créés (`src/validators/product.validator.ts`)
- [ ] Migration complète depuis express-validator (en cours)

#### Architecture
- [x] Audit logger (`src/utils/audit.ts`)
- [x] Gestion erreurs avec codes HTTP appropriés

---

### D) Interface Admin (Minimum Viable)

**Écrans requis** :
1. Liste produits + search + filtres
2. Formulaire create/edit
3. Bouton delete (avec confirmation)

*Note : Priorité au backend, front facultatif.*

---

## Contraintes Techniques

- TypeScript strict
- Prisma ORM
- Pas d'exemples contenant de vrais secrets (uniquement placeholders)
- Directement applicable dans un repo Node/TS classique

---

---

## Stack Actuelle ✅ Confirmée

| Composant | Technologie | Statut |
|-----------|-------------|--------|
| Runtime | Node.js 24+ | ✅ |
| Langage | TypeScript (strict) | ✅ |
| ORM | Prisma 6.x | ✅ |
| Database | PostgreSQL | ✅ |
| Framework | Express 4.x | ✅ |
| Auth | JWT (access + refresh tokens) | ✅ |
| Validation | Zod 4.x + express-validator | ✅ |
| Sécurité | Helmet, CORS, Rate Limiting | ✅ |
| Hachage MDP | bcrypt (12 rounds) | ✅ |
| 2FA | OTPAuth (TOTP) | ✅ |
| Paiement | Stripe | ✅ |
| Email | Nodemailer | ✅ |

---

## Priorités

### ✅ Complété
1. ~~🔴 **Critique** : Supprimer les secrets du repo~~ ✅
2. ~~🟠 **Haute** : Mettre en place les garde-fous~~ ✅
3. ~~🟡 **Moyenne** : Implémenter le CRUD admin sécurisé~~ ✅

### ✅ RGPD Backend Complété
1. ~~🔴 **Critique** : Droit à l'effacement~~ ✅ `DELETE /api/gdpr/delete-now`
2. ~~🔴 **Haute** : Droit à la portabilité~~ ✅ `GET /api/gdpr/export`
3. ~~🟠 **Moyenne** : Gestion du consentement~~ ✅ `GET/PUT /api/gdpr/consent`
4. ~~🟠 **Moyenne** : Script de purge~~ ✅ `npm run gdpr:cleanup`

### 🔜 À faire (Frontend RGPD)
1. 🟠 **Moyenne** : Page "Politique de confidentialité"
2. 🟠 **Moyenne** : Page "Mentions légales"
3. 🟡 **Basse** : Checkbox consentement sur inscription
4. 🟢 **Basse** : Interface admin UI
