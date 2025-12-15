export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`
    try {
      const errorData = await res.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // Si la réponse n'est pas du JSON, on garde le message par défaut
    }
    const error = new Error(errorMessage)
    ;(error as any).status = res.status
    throw error
  }
  return res.json()
}

export type CheckoutItem = { variantId: string; quantity: number }

export async function createCheckoutSession(items: CheckoutItem[], email?: string): Promise<{ url: string | null; sessionId?: string } | { url?: string; sessionId: string } > {
  // Construire les URLs de redirection basées sur l'origine actuelle
  const origin = window.location.origin
  // Stripe remplace {CHECKOUT_SESSION_ID} par l'ID de session réel
  const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/panier`
  
  return fetchJson('/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ 
      items, 
      customerEmail: email,
      successUrl,
      cancelUrl
    })
  })
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

export async function listTradeSets(opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets`)
  return fetchJson(`/trade/sets`)
}

export async function listCardsBySet(setId: string, opts?: { lang?: 'fr' | 'en' }) {
  if (opts?.lang === 'fr') return fetchJson(`/trade-fr/sets/${setId}/cards`)
  return fetchJson(`/trade/sets/${setId}/cards`)
}


