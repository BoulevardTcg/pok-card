# Contact – Flow (Boulevard TCG)

## Vue d’ensemble
- **Front**: page `GET /contact` affiche un formulaire (nom, email, sujet, message) + un champ **honeypot** caché.
- **Back**: `POST /api/contact` valide strictement, applique un **rate limit IP**, ignore silencieusement les bots (honeypot), puis:
  - envoie un email vers `CONTACT_TO_EMAIL` (par défaut `contact@boulevardtcg.com`)
  - envoie un **accusé de réception** à l’expéditeur

## Requête API
`POST /api/contact`

Body JSON:
- `name` (string, requis, 2–80)
- `email` (string, requis, email valide)
- `subject` (string, requis, 2–120)
- `message` (string, requis, 10–4000)
- `website` (string, optionnel) **honeypot**: doit rester vide

Réponses:
- `200 { ok: true }` (y compris si honeypot déclenché, mais aucun email n’est envoyé)
- `400 { ok: false, code: 'VALIDATION_ERROR', details: [...] }`
- `429 { ok: false, code: 'RATE_LIMITED' }`
- `500 { ok:false, code:'SEND_FAILED' | 'INTERNAL_SERVER_ERROR' }`

## Configuration env minimale (server)
Le serveur envoie via SMTP (Hostinger possible).

Variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` si port 465, sinon `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM` (ex: `no-reply@boulevardtcg.com`)
- `CONTACT_TO_EMAIL` (ex: `contact@boulevardtcg.com`)
- (optionnel) `SHOP_NAME`, `FRONTEND_URL`, `SHOP_EMAIL`

Notes:
- `EMAIL_FROM` doit être un sender accepté par ton SMTP (souvent identique à `SMTP_USER`).
- Le message contact utilise `Reply-To: {email expéditeur}` pour pouvoir répondre facilement.
