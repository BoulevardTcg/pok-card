import { PLACEHOLDER_IMAGE } from './utils/imageFallback';
import { getStoredConsent } from './lib/analytics';

/**
 * Lit l'identifiant client GA depuis le cookie `_ga`, uniquement si l'utilisateur
 * a consenti aux cookies analytiques. Sans consentement, GA n'a pas été chargé,
 * donc pas de cookie → on ne transmet rien (cohérent avec la gestion RGPD).
 * Format du cookie : `GA1.1.<random>.<timestamp>` → on garde `<random>.<timestamp>`.
 */
function readGaClientId(): string | undefined {
  if (typeof document === 'undefined' || getStoredConsent() !== 'granted') return undefined;
  const match = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return undefined;
  const clientId = decodeURIComponent(match[1]).replace(/^GA\d\.\d\./, '');
  return /^\d+\.\d+$/.test(clientId) ? clientId : undefined;
}

// URL de base de l'API (avec /api)
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

// URL de base du serveur (sans /api) - pour construire des URLs complètes
export const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:8080';

/**
 * Parse JSON en toute sécurité avec gestion d'erreurs
 * @param json - Chaîne JSON à parser
 * @param fallback - Valeur par défaut si le parsing échoue
 * @returns Objet parsé ou fallback
 */
export function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Normalise une URL d'image pour qu'elle fonctionne en développement et en production.
 * Si l'URL est relative (commence par /), elle est convertie en URL absolue avec API_URL.
 * Si l'URL est déjà absolue (http:// ou https://), elle est retournée telle quelle.
 * @param imageUrl - URL de l'image (relative ou absolue)
 * @returns URL absolue de l'image
 */
export function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return PLACEHOLDER_IMAGE;

  // Si l'URL est déjà absolue, la retourner telle quelle
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Si l'URL est relative et ne commence pas par /img/ (ressources statiques du frontend),
  // préfixer avec API_URL pour pointer vers le backend
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('/img/')) {
    return `${API_URL}${imageUrl}`;
  }

  // Sinon (URL relative vers ressources statiques), retourner telle quelle
  return imageUrl;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: customHeaders, ...restInit } = init || {};
  // eslint-disable-next-line no-useless-catch
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...restInit,
      headers: {
        'Content-Type': 'application/json',
        ...(customHeaders || {}),
      },
    });
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      let errorData: any = {};
      try {
        errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // Ignorer les erreurs de parsing JSON
      }
      const error = new Error(errorMessage) as any;
      error.status = res.status;
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    return res.json();
  } catch (error) {
    // Ré-émettre l'erreur pour qu'elle soit gérée par le code appelant
    throw error;
  }
}

export type CheckoutItem = { variantId: string; quantity: number };
export type ShippingInfo = {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
};

// Point relais Boxtal retourné par GET /shipping/parcel-points
export type ParcelPoint = {
  code: string;
  name: string;
  networks?: string[];
  address: {
    number?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  distanceMeters?: number;
  latitude?: number;
  longitude?: number;
  openingDays?: Record<string, { open: string; close: string }[]>;
};

// Payload point relais envoyé au checkout
export type PickupPointPayload = {
  code: string;
  name: string;
  network?: string;
  address: {
    line1?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
};

export async function searchParcelPoints(params: {
  postalCode: string;
  city?: string;
  country?: string;
  street?: string;
}): Promise<ParcelPoint[]> {
  const query = new URLSearchParams({ postalCode: params.postalCode });
  if (params.city) query.set('city', params.city);
  if (params.country) query.set('country', params.country);
  if (params.street) query.set('street', params.street);

  const res = await fetchJson<{ data: ParcelPoint[] }>(
    `/shipping/parcel-points?${query.toString()}`
  );
  return res.data || [];
}

export async function createCheckoutSession(
  items: CheckoutItem[],
  email?: string,
  promoCode?: string,
  shipping?: ShippingInfo,
  shippingMethodCode?: string,
  idempotencyKey?: string,
  pickupPoint?: PickupPointPayload
): Promise<{ url: string | null; sessionId?: string } | { url?: string; sessionId: string }> {
  // Construire les URLs de redirection basées sur l'origine actuelle
  const origin = window.location.origin;
  // Stripe remplace {CHECKOUT_SESSION_ID} par l'ID de session réel
  // Note: On utilise "sid" au lieu de "session_id" pour éviter un bug d'encodage Stripe
  const successUrl = `${origin}/checkout/success?sid={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/panier`;

  // Récupérer le token pour identifier l'utilisateur
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ajouter le token si l'utilisateur est connecté
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ajouter la clé d'idempotence si fournie
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  try {
    const requestBody = {
      items,
      customerEmail: email,
      promoCode,
      successUrl,
      cancelUrl,
      shipping,
      shippingMethodCode,
      pickupPoint,
      gaClientId: readGaClientId(),
    };

    const res = await fetch(`${API_BASE}/checkout/create-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      let errorData: any = {};
      try {
        errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;

        // Si c'est une erreur d'idempotence (session existante), retourner la session
        if (errorData.code === 'IDEMPOTENT_REQUEST' && errorData.sessionId && errorData.url) {
          return {
            sessionId: errorData.sessionId,
            url: errorData.url,
          };
        }
      } catch {
        // Erreur lors du parsing JSON
      }
      const error = new Error(errorMessage) as any;
      error.status = res.status;
      error.response = { data: errorData, status: res.status };
      throw error;
    }

    return res.json();
  } catch (error: any) {
    // Si c'est déjà une erreur avec status, la ré-émettre
    if (error.status) {
      throw error;
    }

    const networkError = new Error(
      error.message || 'Erreur de connexion au serveur. Vérifiez votre connexion internet.'
    ) as any;
    networkError.status = 0; // 0 = erreur réseau
    networkError.isNetworkError = true;
    throw networkError;
  }
}

export async function listProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.category) qs.set('category', params.category);
  if (params?.search) qs.set('search', params.search);
  return fetchJson(`/products?${qs.toString()}`);
}

export async function getProduct(slug: string) {
  return fetchJson(`/products/${slug}`);
}

// Récupérer le stock à jour pour des variants spécifiques
export async function getVariantsStock(
  variantIds: string[]
): Promise<Record<string, { stock: number; priceCents: number }>> {
  if (variantIds.length === 0) return {};

  // Pour l'instant, on récupère les produits et on extrait les variants
  // Dans une vraie app, on aurait un endpoint dédié /products/variants/stock
  try {
    // Récupérer tous les produits avec leurs variants
    const response = (await listProducts({ limit: 500 })) as { products: any[] };
    const stockMap: Record<string, { stock: number; priceCents: number }> = {};

    response.products.forEach((product) => {
      product.variants.forEach((variant: any) => {
        if (variantIds.includes(variant.id)) {
          stockMap[variant.id] = {
            stock: variant.stock,
            priceCents: variant.priceCents,
          };
        }
      });
    });

    return stockMap;
  } catch {
    return {};
  }
}

export async function buyConcoursTicket(data: { nom: string; email: string }) {
  return fetchJson<{ url: string }>('/concours/checkout-session', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitTrade(payload: {
  userEmail: string;
  haveCard: string;
  wantCard: string;
  message?: string;
}) {
  return fetchJson('/trade', { method: 'POST', body: JSON.stringify(payload) });
}

export type ContactMessagePayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  companyWebsite?: string;
  website?: string;
};

export async function sendContactMessage(
  payload: ContactMessagePayload
): Promise<{ ok: true } | { ok: false; code?: string; error?: string }> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetchJson('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });
}

export async function listTradeSets(opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets`);
  return fetchJson(`/trade/sets`);
}

export async function listCardsBySet(setId: string, opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets/${setId}/cards`);
  return fetchJson(`/trade/sets/${setId}/cards`);
}

// Codes promo
export async function validatePromoCode(code: string, totalCents: number) {
  return fetchJson<{
    valid: boolean;
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    discountCents: number;
    finalAmountCents: number;
  }>('/promo/validate', {
    method: 'POST',
    body: JSON.stringify({ code, totalCents }),
  });
}

export async function applyPromoCode(code: string) {
  return fetchJson<{ message: string }>('/promo/apply', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// Avis produits
export async function getProductReviews(productId: string, page = 1, limit = 10) {
  return fetchJson(`/reviews/product/${productId}?page=${page}&limit=${limit}`);
}

export async function canReviewProduct(
  productId: string
): Promise<{ canReview: boolean; reason: string | null; message: string | null }> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return {
      canReview: false,
      reason: 'NOT_LOGGED_IN',
      message: 'Connectez-vous pour laisser un avis',
    };
  }
  try {
    return await fetchJson(`/reviews/can-review/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Token invalide ou expiré - considérer comme non connecté
    return {
      canReview: false,
      reason: 'NOT_LOGGED_IN',
      message: 'Connectez-vous pour laisser un avis',
    };
  }
}

export async function createReview(
  productId: string,
  rating: number,
  title?: string,
  comment?: string
) {
  const token = localStorage.getItem('accessToken');
  return fetchJson('/reviews', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId, rating, title, comment }),
  });
}

// Offres d'échange
export async function getTradeOffers(type: 'all' | 'sent' | 'received' = 'all') {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers?type=${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function createTradeOffer(
  receiverId: string,
  creatorCards: any[],
  receiverCards: any[],
  message?: string
) {
  const token = localStorage.getItem('accessToken');
  return fetchJson('/trade-offers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ receiverId, creatorCards, receiverCards, message }),
  });
}

export async function acceptTradeOffer(offerId: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers/${offerId}/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function rejectTradeOffer(offerId: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers/${offerId}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
