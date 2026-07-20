# Prompt : migration livraison Mondial Relay → Boxtal API v3 (projet tamp)

> Copier-coller tout ce qui suit comme premier message d'une session Claude Code ouverte dans le projet tamp.

---

Je veux remplacer entièrement l'intégration actuelle de l'API Mondial Relay par **Boxtal API v3** (agrégateur multi-transporteurs). J'ai déjà fait cette migration sur mon autre projet (BoulevardTCG) : voici toutes les connaissances acquises et vérifiées en conditions réelles — appuie-toi dessus pour aller vite et éviter les pièges déjà rencontrés. Ne me redemande pas les décisions de périmètre listées ci-dessous.

## Décisions de périmètre (déjà tranchées, identiques à BoulevardTCG)

- **Frais de port : prix fixes** définis par la boutique — pas de cotation dynamique Boxtal au checkout.
- **Le client choisit son point relais au checkout** : sélecteur alimenté par l'API Boxtal via un **proxy backend rate-limité** (les clés API ne transitent jamais côté front). Choix obligatoire si le mode de livraison est en relais (validation front ET back).
- **Étiquettes générées depuis l'admin** via l'API ; la saisie manuelle (transporteur + n° de suivi) reste disponible en secours.
- **Cycle d'états réaliste** :
  - étiquette créée → commande « **En préparation** » (pas d'email)
  - premier scan transporteur (webhook ou resync) → « **Expédiée** » + email client avec n° de suivi
  - livraison → « **Livrée** » + email de confirmation
  - L'état « En préparation » doit être visible côté client (badge + étape de timeline) ET côté admin.
- **Suivi automatique** par webhooks Boxtal + bouton « Resync » dans l'admin (récupère suivi/étiquette et applique les transitions — utile en local sans URL publique).
- L'ancienne intégration Mondial Relay est **supprimée** une fois Boxtal fonctionnel (pas de double système).

## Spec API Boxtal v3 (vérifiée en réel le 15/07/2026)

- **Environnements** : test `https://api.boxtal.build` (compte sandbox séparé, rien n'est facturé), prod `https://api.boxtal.com`. Les clés test/prod ne sont pas interchangeables.
- **Auth** : `Authorization: Basic base64(accessKey:secretKey)` acceptée sur **tous** les endpoints — inutile de gérer un token Bearer.
- **Endpoints** :
  - `GET /shipping/v3.1/content-category?language=fr` — catégories de contenu (cartes/produits culturels = `content:v1:80100`)
  - `GET /shipping/v3.2/parcel-point-by-shipping-offer?operationType=ARRIVAL&shippingOfferCode=<code>&postalCode=<cp>&city=<ville>&countryIsoCode=FR` — recherche de points relais (params optionnels `street`, `number`)
  - `POST /shipping/v3.1/shipping-order` — création d'expédition
  - `GET /shipping/v3.1/shipping-order/{id}` — détail (status, prix HT, dates)
  - `GET /shipping/v3.1/shipping-order/{id}/tracking` — suivi
  - `GET /shipping/v3.1/shipping-order/{id}/shipping-document` — documents (étiquette)
  - `DELETE /shipping/v3.1/shipping-order/{id}` — annulation (422 si déjà prise en charge)
  - `POST /shipping/v3.1/subscription` — souscription webhook `{ eventType: "DOCUMENT_CREATED"|"TRACKING_CHANGED", callbackUrl, webhookSecret }`

### Pièges vérifiés en réel (à ne pas redécouvrir)

1. La réponse parcel-point imbrique chaque point sous la clé **`parcelPoint` (camelCase)** — les libs de référence publiques utilisent `parcelpoint` en minuscules. Accepter les deux graphies dans le normaliseur, sinon liste vide silencieuse. Structure : `{ content: [{ parcelPoint: { code, name, location: { street, number, city, postalCode, countryIsoCode, position: { latitude, longitude } }, openingDays: { MONDAY: [{ openingTime, closingTime }] | null, ... }, compatibleNetworks: [...] }, distanceFromSearchLocation: <mètres> }] }`.
2. Suivi et étiquette renvoient **422** tant qu'ils ne sont pas générés (systématique juste après création) → retourner `null`, compléter plus tard via webhook ou resync. Ne pas traiter comme une erreur.
3. **Webhooks** : header `x-bxt-signature` = HMAC SHA256 du **corps brut** avec le `webhookSecret` de la souscription — l'encodage n'est pas documenté, accepter **hex ET base64** (comparaison timing-safe). Répondre en **moins de 2 s** sinon rejeu (10 tentatives sur 24 h). Répondre 200 même pour une commande inconnue (éviter les rejeux). Événements : `TRACKING_CHANGED` (payload.trackings: [{ status, trackingNumber, packageTrackingUrl }]) et `DOCUMENT_CREATED` (payload.documents: [{ url, type: "LABEL", format }]) + champs racine `shippingOrderId` et `shipmentExternalId`.
4. Le corps brut est indispensable pour la signature → monter la route webhook **avant** le body-parser JSON global (comme un webhook Stripe).
5. **Statuts de suivi** : `ANNOUNCED` (étiquette créée — ne rien faire), `SHIPPED`/`IN_TRANSIT`/`OUT_FOR_DELIVERY`/`FAILED_ATTEMPT`/`REACHED_DELIVERY_PICKUP_POINT` → expédiée, `DELIVERED` → livrée, `RETURNED`/`EXCEPTION` → logger. Statuts de la commande d'expédition : `PENDING` → `REQUESTED` → `CONFIRMED` (étiquette dispo) / `CANCELLED`.
6. **Codes d'offre** (validés sur l'env de test) : relais Mondial Relay = `MONR-CpourToi`, domicile Colissimo = `POFR-ColissimoAccess` (existe aussi `POFR-ColissimoExpert`). Le préfixe avant le tiret identifie l'opérateur : MONR, POFR, CHRP (Chronopost), UPSE, DHLE, FEDX — utile pour mapper vers un enum transporteur interne. Un code invalide → 400 `ValidationException.ValidShippingOfferCode`.
7. L'URL de l'étiquette est **signée et expire après 7 jours** — la re-récupérer via `/shipping-document` si besoin (bouton resync).
8. Le prix affiché par Boxtal (`deliveryPriceExclTax`) est ce que paie la boutique (HT, tarif négocié) — rien à voir avec les frais de port facturés au client. Ne pas essayer de les faire correspondre.

### Payload de création d'expédition (structure exacte)

```json
{
  "shippingOfferCode": "MONR-CpourToi",
  "labelType": "PDF_A4",
  "shipment": {
    "externalId": "<id interne de la commande — sert de fallback de lookup webhook>",
    "content": { "id": "content:v1:80100", "description": "Description du contenu" },
    "fromAddress": {
      "type": "BUSINESS",
      "contact": { "firstName": "...", "lastName": "...", "email": "...", "phone": "+33612345678", "company": "..." },
      "location": { "street": "rue des Cartes", "number": "10", "postalCode": "75001", "city": "Paris", "countryIsoCode": "FR" }
    },
    "toAddress": { "type": "RESIDENTIAL", "contact": { "...": "phone OBLIGATOIRE, format +33..." }, "location": { "...": "..." } },
    "returnAddress": "<copie de fromAddress>",
    "packages": [{
      "type": "PARCEL",
      "weight": 0.3,
      "length": 24, "width": 18, "height": 8,
      "value": { "value": 45.0, "currency": "EUR" },
      "content": { "id": "content:v1:80100", "description": "..." },
      "externalId": "<id commande>"
    }],
    "pickupPointCode": "<code relais — OBLIGATOIRE pour une offre relais, omis pour domicile>"
  }
}
```

Contraintes : poids en **kg** (précision au gramme), dimensions en **cm entiers**, valeur en euros ; `Contact` exige firstName/lastName/email/**phone international** (normaliser `06...` → `+336...`) ; `Location` exige street/city/countryIsoCode, le numéro de voie va dans `number` (splitter « 12 rue X »). Réponse : `{ content: { id: "2440...FR", status: "PENDING" } }`.

## Marche à suivre

1. **Explore d'abord** le code existant de tamp : où vit l'intégration Mondial Relay actuelle (config, service/appels API, modèle de commande en DB, checkout, sélecteur de relais front, admin expédition, emails, webhooks éventuels). Dresse la liste des points de contact avant d'écrire du code, et présente-moi ton plan d'intégration adapté au stack de CE projet avant d'implémenter.
2. Reproduis le découpage qui a fait ses preuves sur BoulevardTCG :
   - **config boxtal** : lecture env → objet config, `null` si clés absentes (= fonctionnalité désactivée proprement, l'app doit démarrer sans les clés)
   - **service boxtal** : client HTTP (timeout ~15 s) + normalisations défensives + mappings transporteur/statuts
   - **route publique** de recherche de points relais (proxy, rate-limitée, validation des params)
   - **endpoint admin** de création d'étiquette, **idempotent** : persister l'id Boxtal immédiatement après création ; si l'expédition existe déjà → resynchronisation (suivi + étiquette + transitions) au lieu d'une double étiquette
   - **handler webhook** (vérif signature, TRACKING_CHANGED, DOCUMENT_CREATED)
   - **service de transitions d'état partagé** webhook/resync, idempotent (pas de double transition ni double email), qui déclenche les emails client
3. **DB** : ajouter sur la commande `boxtalShippingOrderId` (unique — lookup webhook), `labelUrl`, `pickupPointCode`, `pickupPoint` (json : code, name, network, adresse). Migration selon les conventions du projet.
4. **Front** : sélecteur de point relais (recherche CP/ville, liste nom + adresse + distance + horaires, sélection obligatoire si mode relais, conservé dans le brouillon de checkout s'il y en a un) ; affichage du relais choisi sur les pages commande client et admin ; boutons admin « Expédier via Boxtal » / « Resync » + lien étiquette PDF ; état « En préparation » visible client et admin (badge + étape de timeline).
5. **Emails** : l'email d'expédition part au passage réel en « expédiée » (premier scan transporteur), pas à la création d'étiquette ; inclure le point relais (nom + adresse + rappel pièce d'identité).
6. Supprime l'ancienne intégration Mondial Relay (code, config, env) une fois la nouvelle vérifiée.

## Variables d'environnement à prévoir (mêmes noms que BoulevardTCG)

```
BOXTAL_ACCESS_KEY / BOXTAL_SECRET_KEY        # je te les fournirai — mets des placeholders et demande-les-moi
BOXTAL_API_BASE_URL                          # https://api.boxtal.build (test) puis https://api.boxtal.com (prod)
BOXTAL_SHIPPING_OFFER_CODE_RELAY             # ex MONR-CpourToi
BOXTAL_SHIPPING_OFFER_CODE_HOME              # ex POFR-ColissimoAccess
BOXTAL_SHIPPER_COMPANY / _FIRST_NAME / _LAST_NAME / _EMAIL / _PHONE / _ADDRESS / _POSTAL_CODE / _CITY / _COUNTRY
BOXTAL_PACKAGE_BASE_WEIGHT_GRAMS / _ITEM_WEIGHT_GRAMS / _LENGTH_CM / _WIDTH_CM / _HEIGHT_CM
BOXTAL_CONTENT_CATEGORY_ID / _DESCRIPTION    # défaut content:v1:80100 si produits culturels/cartes
BOXTAL_LABEL_TYPE                            # PDF_A4 ou PDF_10x15
BOXTAL_WEBHOOK_SECRET                        # choisi par nous à la souscription des webhooks
```

## Validation attendue avant de me dire « c'est fini »

- **Tests unitaires du service** avec fetch mocké sur les **vraies formes de réponse** ci-dessus (y compris `parcelPoint` camelCase, `openingDays` à null, 422 suivi/étiquette).
- **Tests d'intégration** : checkout relais sans point relais → 400 ; point relais au format invalide → 400 ; webhook signature invalide → 401 ; webhook commande inconnue → 200 ; transitions PREPARING → SHIPPED → DELIVERED idempotentes ; endpoint admin création → « en préparation » (pas « expédiée ») puis resync → « expédiée ».
- **Script smoke test rejouable** contre l'environnement de test (recherche relais → création d'expédition → suivi/étiquette → annulation), qui **refuse de tourner contre la prod** sans un flag explicite `--allow-prod`.
- Lint + typecheck + suite de tests complète du projet au vert.

Les clés de test Boxtal se créent sur https://redirect.boxtal.build/iam/app-redirect/register?app=developer&profile=default&language=fr (compte sandbox gratuit → Applications → créer une app API v3 → paire access key/secret key). Je te donnerai les clés quand tu en auras besoin — ne bloque pas dessus pour commencer l'exploration et l'implémentation.
