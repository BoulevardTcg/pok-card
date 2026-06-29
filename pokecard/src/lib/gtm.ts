// Google Tag Manager (GTM) — chargement conditionné au consentement RGPD.
//
// GTM coexiste avec gtag.js (voir lib/analytics.ts), mais les deux ont des
// rôles distincts pour éviter le double comptage :
//   - gtag.js  → mesure d'audience GA4 (propriété G-48XSD96XGF).
//   - GTM      → conteneur pour les AUTRES tags (Meta Pixel, Google Ads…).
//
// ⚠️ Ne JAMAIS configurer un tag GA4 sur la propriété G-48XSD96XGF dans GTM :
// gtag.js l'envoie déjà, ce serait compté deux fois.
//
// Comme pour gtag.js, aucune requête vers Google n'est émise tant que
// l'utilisateur n'a pas accepté les cookies (voir <CookieConsent />). Le
// snippet officiel de GTM n'est donc PAS collé dans index.html, et la balise
// <noscript> (iframe) est volontairement omise : elle chargerait GTM sans
// consentement.

const GTM_CONTAINER_ID = (import.meta.env.VITE_GTM_CONTAINER_ID ?? 'GTM-P6LZF77Z').trim();

let gtmLoaded = false;

/** Indique si un conteneur GTM est configuré (sinon toutes les fonctions sont no-op). */
export function isGtmConfigured(): boolean {
  return GTM_CONTAINER_ID.length > 0;
}

/**
 * Injecte le script GTM et démarre le conteneur. Idempotent : ne charge le
 * script qu'une fois. À n'appeler qu'après consentement explicite.
 *
 * GTM partage `window.dataLayer` avec gtag.js — c'est attendu : les deux
 * empilent sur le même tableau sans interférer.
 */
export function enableGtm(): void {
  if (gtmLoaded || typeof window === 'undefined' || !GTM_CONTAINER_ID) return;
  gtmLoaded = true;

  window.dataLayer = window.dataLayer || [];
  // GTM empile un objet ; gtag empile des « arguments ». Le même dataLayer
  // accueille les deux (cast nécessaire car le type est calé sur gtag).
  (window.dataLayer as unknown[]).push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

/**
 * GTM ne propose pas de désactivation propre en cours de session une fois
 * chargé (contrairement au flag `ga-disable-*` de GA). Tant que l'utilisateur
 * n'a pas accepté, `enableGtm()` n'est jamais appelé donc rien ne charge ; en
 * cas de retrait du consentement après acceptation, un rechargement de page
 * est nécessaire pour purger le conteneur. On expose ce no-op documenté pour
 * garder la symétrie avec analytics.ts.
 */
export function disableGtm(): void {
  // Volontairement vide : voir la note ci-dessus.
}
