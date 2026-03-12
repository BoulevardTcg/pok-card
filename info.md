# Info — Authentification cross-projet (Boutique ↔ Marketplace)

## Contexte

Le marketplace utilise les tokens JWT émis par la boutique (`JWT_SECRET` identique).
Le refresh token est actuellement accepté via `req.body?.refreshToken` comme fallback au cookie httpOnly — nécessaire car les deux apps sont sur des domaines potentiellement différents.

---

## Problème de sécurité

Le fallback `req.body?.refreshToken` expose le refresh token aux attaques XSS :
si un script malveillant tourne sur le frontend, il peut lire et exfiltrer le token depuis le body.

```typescript
// auth.ts ~ligne 266 — fallback problématique
const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
```

---

## Solution recommandée : sous-domaines partagés

Déployer les deux apps sur des sous-domaines du même domaine parent et configurer le cookie avec `Domain=.boulevardtcg.com`. Le cookie httpOnly est alors automatiquement transmis sur les deux apps, sans jamais transiter en JS.

### Changement backend boutique (`auth.ts`)

```typescript
res.cookie(REFRESH_COOKIE_NAME, token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  domain: '.boulevardtcg.com', // ← ajouter
  maxAge: ...,
});
```

### Déploiement cible

| App        | URL                              |
|------------|----------------------------------|
| Boutique   | `www.boulevardtcg.com`           |
| Marketplace| `marketplace.boulevardtcg.com`   |

Le cookie est envoyé automatiquement sur les deux. Le fallback `req.body?.refreshToken` peut être supprimé.

---

## Question d'architecture à clarifier

Le marketplace a-t-il vraiment besoin du **refresh token** ?

- Normalement, seul l'**access token** (header `Authorization: Bearer ...`) est nécessaire pour les requêtes API.
- Le **refresh token** ne devrait être utilisé que pour obtenir un nouvel access token — et cette opération devrait se faire exclusivement côté **boutique**.
- Si le marketplace rafraîchit lui-même les tokens, il faudrait revoir le flow : le refresh devrait être délégué à la boutique (redirect ou appel API dédié).

### Flow propre recommandé

```
[User]
  │
  ├─ Login → Boutique → reçoit access_token (court) + refresh_token (cookie httpOnly)
  │
  ├─ Requêtes Marketplace → Authorization: Bearer <access_token>
  │
  └─ Access token expiré ?
       └─ Appel POST boutique/api/auth/refresh (cookie envoyé automatiquement via sous-domaine)
            └─ Reçoit nouveau access_token → reprend les requêtes marketplace
```

---

## Priorité

- **Garder le fallback** tant que les sous-domaines ne sont pas configurés.
- **Supprimer le fallback** dès que le déploiement sur sous-domaines est en place.
- **Clarifier** si le marketplace refresh lui-même ou délègue à la boutique.
