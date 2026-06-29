// Google Analytics (GA4) — chargement conditionné au consentement RGPD.
//
// Aucune requête vers Google n'est émise tant que l'utilisateur n'a pas
// explicitement accepté les cookies analytiques (voir <CookieConsent />).
// Le suivi des changements de page est géré manuellement pour fonctionner
// dans la SPA (React Router), où un seul document HTML est chargé.

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? 'G-48XSD96XGF').trim();

export const CONSENT_STORAGE_KEY = 'boulevard-cookie-consent';

export type ConsentValue = 'granted' | 'denied';

type GtagArgs = unknown[];

declare global {
  interface Window {
    dataLayer?: GtagArgs[];
    gtag?: (...args: GtagArgs) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

let scriptLoaded = false;
let lastTrackedPath: string | null = null;

/**
 * Paramètres de requête à NE JAMAIS transmettre à Google Analytics : tokens,
 * identifiants de session, email… Plusieurs routes les passent dans l'URL
 * (`/reset-password?token=…&email=…`, `/order-tracking?token=…`,
 * `/checkout/success?sid=…`). Les envoyer à un tiers serait une fuite de
 * secrets / PII (et un manquement RGPD).
 */
const SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'email',
  'sid',
  'session_id',
  'code',
  'access_token',
  'refresh_token',
  'otp',
  'password',
  'returnto',
]);

/** Remplace la valeur des paramètres sensibles par « redacted ». */
function sanitizePath(rawPath: string): string {
  const queryIndex = rawPath.indexOf('?');
  if (queryIndex === -1) return rawPath;

  const path = rawPath.slice(0, queryIndex);
  const params = new URLSearchParams(rawPath.slice(queryIndex + 1));
  for (const key of [...params.keys()]) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
      params.set(key, 'redacted');
    }
  }
  const cleaned = params.toString();
  return cleaned ? `${path}?${cleaned}` : path;
}

/** Lit le consentement stocké, ou `null` si l'utilisateur n'a pas encore choisi. */
export function getStoredConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (value === 'granted' || value === 'denied') return value;
  } catch {
    // localStorage indisponible (mode privé, etc.)
  }
  return null;
}

/** Persiste le choix de l'utilisateur. */
export function storeConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Ignorer si localStorage indisponible
  }
}

/**
 * Injecte gtag.js et active GA. Idempotent : ne charge le script qu'une fois.
 * À n'appeler qu'après consentement explicite.
 */
export function enableAnalytics(): void {
  if (scriptLoaded || typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  scriptLoaded = true;

  // Réactiver GA s'il avait été désactivé pendant la session.
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;

  window.dataLayer = window.dataLayer || [];
  const gtag: Window['gtag'] = (...args) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  gtag('js', new Date());
  // send_page_view: false → on envoie les page_view nous-mêmes (SPA),
  // ce qui évite les doublons sur le premier chargement.
  gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Première vue (page courante au moment du consentement).
  trackPageView(window.location.pathname + window.location.search);
}

/**
 * Désactive GA pour la session courante (si l'utilisateur retire son consentement
 * après l'avoir donné). Le flag `ga-disable-*` est lu par gtag.js à chaque hit.
 */
export function disableAnalytics(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return;
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
}

/**
 * Évènement global permettant de rouvrir le bandeau de consentement depuis
 * n'importe où (lien « Gérer les cookies » du footer, page Confidentialité…).
 */
export const OPEN_COOKIE_SETTINGS_EVENT = 'open-cookie-settings';

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}

/**
 * Envoie un évènement page_view. No-op tant que GA n'est pas activé.
 * Ignore deux appels consécutifs sur le même chemin (évite les doublons
 * au montage, quand l'activation de GA et le suivi de route coïncident).
 */
export function trackPageView(path: string): void {
  if (!scriptLoaded || typeof window === 'undefined' || !window.gtag) return;

  const safePath = sanitizePath(path);
  if (safePath === lastTrackedPath) return;
  lastTrackedPath = safePath;

  window.gtag('event', 'page_view', {
    page_path: safePath,
    // On reconstruit l'URL absolue à partir du chemin expurgé plutôt que
    // d'utiliser window.location.href (qui contiendrait les tokens en clair).
    page_location: window.location.origin + safePath,
    page_title: document.title,
  });
}
