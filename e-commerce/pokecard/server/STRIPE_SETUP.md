# 🎯 Guide de Configuration Stripe

Ce guide vous explique comment configurer Stripe pour activer les paiements sur votre site.

## 📋 Prérequis

- ✅ Compte Stripe créé (https://stripe.com)
- ✅ Clés API Stripe (déjà configurées dans `.env`)
- ✅ Serveur backend en cours d'exécution

## 🔑 Étape 1 : Vérifier les clés API

Vos clés Stripe sont déjà configurées dans `pokecard/server/.env` :

```env
STRIPE_SECRET_KEY="sk_test_VOTRE_CLE_SECRETE_ICI"
```

## 🔗 Étape 2 : Configurer le Webhook Stripe

Le webhook est essentiel pour que votre backend soit notifié quand un paiement est complété.

### 2.1 Accéder au Dashboard Stripe

1. Allez sur https://dashboard.stripe.com/test/webhooks
2. Assurez-vous d'être en mode **Test** (bouton en haut à droite)

### 2.2 Créer un endpoint webhook

1. Cliquez sur **"Add endpoint"** ou **"Add webhook endpoint"**
2. Configurez l'endpoint :
   - **Endpoint URL** : 
     - En développement local : `http://localhost:8080/api/checkout/webhook`
     - ⚠️ **Pour tester en local**, vous devrez utiliser **Stripe CLI** (voir section 3)
   - **Description** : "Webhook pour les paiements checkout"
   - **Events to send** : Sélectionnez `checkout.session.completed`
3. Cliquez sur **"Add endpoint"**

### 2.3 Récupérer le Signing Secret

1. Une fois l'endpoint créé, cliquez dessus
2. Dans la section **"Signing secret"**, cliquez sur **"Reveal"**
3. Copiez le secret (commence par `whsec_...`)
4. Mettez à jour votre `.env` :

```env
STRIPE_WEBHOOK_SECRET="whsec_VOTRE_SECRET_ICI"
```

## 🛠️ Étape 3 : Tester en Local avec Stripe CLI

Pour tester les webhooks en local, vous devez utiliser **Stripe CLI** :

### 3.1 Installer Stripe CLI

**Windows (PowerShell) :**
```powershell
# Télécharger depuis https://github.com/stripe/stripe-cli/releases
# Ou utiliser Scoop :
scoop install stripe
```

**Mac :**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux :**
```bash
# Télécharger depuis https://github.com/stripe/stripe-cli/releases
```

### 3.2 Se connecter à Stripe CLI

```bash
stripe login
```

Cela ouvrira votre navigateur pour vous authentifier.

### 3.3 Rediriger les webhooks vers votre serveur local

Dans un **nouveau terminal**, lancez :

```bash
stripe listen --forward-to localhost:8080/api/checkout/webhook
```

Stripe CLI vous donnera un **webhook signing secret** qui commence par `whsec_...`. **Utilisez ce secret** dans votre `.env` pour les tests locaux :

```env
STRIPE_WEBHOOK_SECRET="whsec_LE_SECRET_DE_STRIPE_CLI"
```

### 3.4 Tester un événement

Dans un autre terminal :

```bash
stripe trigger checkout.session.completed
```

Cela enverra un événement de test à votre webhook local.

## 🧪 Étape 4 : Tester le Paiement

### 4.1 Démarrer le serveur backend

```bash
cd pokecard/server
npm run dev
```

### 4.2 Démarrer le frontend

```bash
cd pokecard
npm run dev
```

### 4.3 Tester le flux complet

1. Allez sur http://localhost:5173
2. Ajoutez des produits au panier
3. Allez au panier (`/panier`)
4. Cliquez sur **"Procéder au paiement"**
5. Utilisez une carte de test Stripe :
   - **Numéro de carte** : `4242 4242 4242 4242`
   - **Date d'expiration** : N'importe quelle date future (ex: `12/34`)
   - **CVC** : N'importe quel 3 chiffres (ex: `123`)
   - **Code postal** : N'importe quel code postal valide
6. Complétez le paiement
7. Vous serez redirigé vers `/checkout/success`

### 4.4 Vérifier dans le Dashboard Stripe

1. Allez sur https://dashboard.stripe.com/test/payments
2. Vous devriez voir votre paiement de test
3. Allez sur https://dashboard.stripe.com/test/webhooks
4. Vérifiez que les événements sont bien reçus

## 🚀 Étape 5 : Configuration pour la Production

Quand vous déployez en production :

### 5.1 Passer en mode Live

1. Dans le Dashboard Stripe, basculez sur **"Live"** (bouton en haut à droite)
2. Récupérez vos **clés Live** :
   - `sk_live_...` (Secret Key)
   - `pk_live_...` (Publishable Key - optionnel)

### 5.2 Mettre à jour le `.env` de production

```env
STRIPE_SECRET_KEY="sk_live_VOTRE_CLE_LIVE"
STRIPE_WEBHOOK_SECRET="whsec_VOTRE_SECRET_WEBHOOK_LIVE"
```

### 5.3 Configurer le webhook de production

1. Créez un nouvel endpoint webhook dans Stripe (mode Live)
2. URL : `https://votre-domaine.com/api/checkout/webhook`
3. Événement : `checkout.session.completed`
4. Copiez le secret et mettez-le dans votre `.env` de production

### 5.4 Mettre à jour les URLs de redirection

Dans votre `.env` de production :

```env
CHECKOUT_SUCCESS_URL="https://votre-domaine.com/checkout/success"
CHECKOUT_CANCEL_URL="https://votre-domaine.com/panier"
ALLOWED_REDIRECT_DOMAINS="https://votre-domaine.com"
```

## 📊 Cartes de Test Stripe

Voici quelques cartes de test utiles :

| Scénario | Numéro de carte | Résultat |
|----------|----------------|----------|
| Paiement réussi | `4242 4242 4242 4242` | ✅ Succès |
| Paiement refusé | `4000 0000 0000 0002` | ❌ Refusé |
| 3D Secure requis | `4000 0025 0000 3155` | 🔐 3D Secure |
| Carte à débit insuffisant | `4000 0000 0000 9995` | ❌ Fonds insuffisants |

**Date d'expiration** : N'importe quelle date future  
**CVC** : N'importe quel 3 chiffres  
**Code postal** : N'importe quel code postal valide

## 🔍 Dépannage

### Le webhook ne fonctionne pas

1. Vérifiez que `STRIPE_WEBHOOK_SECRET` est bien défini dans `.env`
2. Vérifiez que le serveur backend est en cours d'exécution
3. Vérifiez les logs du serveur pour voir les erreurs
4. En local, assurez-vous que Stripe CLI est en cours d'exécution

### Erreur "Stripe n'est pas configuré"

1. Vérifiez que `STRIPE_SECRET_KEY` est bien défini dans `.env`
2. Redémarrez le serveur backend après avoir modifié `.env`

### Le paiement fonctionne mais la commande n'est pas créée

1. Vérifiez que le webhook est bien configuré
2. Vérifiez les logs du serveur pour voir si le webhook est reçu
3. Vérifiez que `STRIPE_WEBHOOK_SECRET` correspond au secret de votre endpoint

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Cartes de test Stripe](https://stripe.com/docs/testing)

## ✅ Checklist de Configuration

- [ ] Clés API Stripe configurées dans `.env`
- [ ] Webhook configuré dans le Dashboard Stripe (ou Stripe CLI en local)
- [ ] `STRIPE_WEBHOOK_SECRET` défini dans `.env`
- [ ] Serveur backend démarré
- [ ] Frontend démarré
- [ ] Test de paiement effectué avec succès
- [ ] Commande créée dans la base de données après paiement
- [ ] Stock décrémenté après paiement

Une fois tous ces éléments cochés, votre système de paiement est opérationnel ! 🎉




