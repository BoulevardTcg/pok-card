export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: customHeaders, ...restInit } = init || {}
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...restInit,
      headers: { 
        'Content-Type': 'application/json', 
        ...(customHeaders || {}) 
      },
    })
    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`
      try {
        const errorData = await res.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Ignorer les erreurs de parsing JSON
      }
      const error = new Error(errorMessage)
      ;(error as any).status = res.status
      throw error
    }
    return res.json()
  } catch (error) {
    // Ré-émettre l'erreur pour qu'elle soit gérée par le code appelant
    throw error
  }
}

export type CheckoutItem = { variantId: string; quantity: number }
export type ShippingInfo = {
  fullName: string
  addressLine1: string
  addressLine2?: string
  postalCode: string
  city: string
  country: string
  phone?: string
}

export async function createCheckoutSession(
  items: CheckoutItem[],
  email?: string,
  promoCode?: string,
  shipping?: ShippingInfo,
  shippingMethodCode?: string
): Promise<{ url: string | null; sessionId?: string } | { url?: string; sessionId: string }> {
  // Construire les URLs de redirection basées sur l'origine actuelle
  const origin = window.location.origin
  // Stripe remplace {CHECKOUT_SESSION_ID} par l'ID de session réel
  // Note: On utilise "sid" au lieu de "session_id" pour éviter un bug d'encodage Stripe
  const successUrl = `${origin}/checkout/success?sid={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/panier`
  
  // Récupérer le token pour identifier l'utilisateur
  const token = localStorage.getItem('accessToken')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  // Ajouter le token si l'utilisateur est connecté
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}/checkout/create-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      items, 
      customerEmail: email,
      promoCode,
      successUrl,
      cancelUrl,
      shipping,
      shippingMethodCode,
    })
  })
  
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // ignore
    }
    throw new Error(errorMessage)
  }
  
  return res.json()
}

export async function listProducts(params?: { page?: number; limit?: number; category?: string; search?: string }) {
  const qs = new URLSearchParams()
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.category) qs.set('category', params.category)
  if (params?.search) qs.set('search', params.search)
  return fetchJson(`/products?${qs.toString()}`)
}

export async function getProduct(slug: string) {
  return fetchJson(`/products/${slug}`)
}

// Récupérer le stock à jour pour des variants spécifiques
export async function getVariantsStock(variantIds: string[]): Promise<Record<string, { stock: number; priceCents: number }>> {
  if (variantIds.length === 0) return {};
  
  // Pour l'instant, on récupère les produits et on extrait les variants
  // Dans une vraie app, on aurait un endpoint dédié /products/variants/stock
  try {
    // Récupérer tous les produits avec leurs variants
    const response = await listProducts({ limit: 500 }) as { products: any[] };
    const stockMap: Record<string, { stock: number; priceCents: number }> = {};
    
    response.products.forEach(product => {
      product.variants.forEach((variant: any) => {
        if (variantIds.includes(variant.id)) {
          stockMap[variant.id] = {
            stock: variant.stock,
            priceCents: variant.priceCents
          };
        }
      });
    });
    
    return stockMap;
  } catch (error) {
    console.error('Erreur lors de la récupération du stock:', error);
    return {};
  }
}

export async function buyConcoursTicket(data: { nom: string; email: string }) {
  return fetchJson<{ url: string }>('/concours/checkout-session', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function submitTrade(payload: { userEmail: string; haveCard: string; wantCard: string; message?: string }) {
  return fetchJson('/trade', { method: 'POST', body: JSON.stringify(payload) })
}

export type ContactMessagePayload = {
  name: string
  email: string
  subject: string
  message: string
  companyWebsite?: string
  website?: string
}

export async function sendContactMessage(payload: ContactMessagePayload): Promise<{ ok: true } | { ok: false; code?: string; error?: string }> {
  return fetchJson('/contact', { method: 'POST', body: JSON.stringify(payload) })
}

export async function listTradeSets(opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets`)
  return fetchJson(`/trade/sets`)
}

export async function listCardsBySet(setId: string, opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets/${setId}/cards`)
  return fetchJson(`/trade/sets/${setId}/cards`)
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
    body: JSON.stringify({ code, totalCents })
  });
}

export async function applyPromoCode(code: string) {
  return fetchJson<{ message: string }>('/promo/apply', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

// Avis produits
export async function getProductReviews(productId: string, page = 1, limit = 10) {
  return fetchJson(`/reviews/product/${productId}?page=${page}&limit=${limit}`);
}

export async function canReviewProduct(productId: string): Promise<{ canReview: boolean; reason: string | null; message: string | null }> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return { canReview: false, reason: 'NOT_LOGGED_IN', message: 'Connectez-vous pour laisser un avis' };
  }
  try {
    return await fetchJson(`/reviews/can-review/${productId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch {
    // Token invalide ou expiré - considérer comme non connecté
    return { canReview: false, reason: 'NOT_LOGGED_IN', message: 'Connectez-vous pour laisser un avis' };
  }
}

export async function createReview(productId: string, rating: number, title?: string, comment?: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson('/reviews', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ productId, rating, title, comment })
  });
}

// Offres d'échange
export async function getTradeOffers(type: 'all' | 'sent' | 'received' = 'all') {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers?type=${type}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

export async function createTradeOffer(receiverId: string, creatorCards: any[], receiverCards: any[], message?: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson('/trade-offers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ receiverId, creatorCards, receiverCards, message })
  });
}

export async function acceptTradeOffer(offerId: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers/${offerId}/accept`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

export async function rejectTradeOffer(offerId: string) {
  const token = localStorage.getItem('accessToken');
  return fetchJson(`/trade-offers/${offerId}/reject`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}


