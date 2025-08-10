export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export type CheckoutItem = { id: string; quantity: number }

export async function createCheckoutSession(items: CheckoutItem[], email?: string): Promise<{ url: string | null; id?: string } | { url?: string; id: string } > {
  return fetchJson('/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ items, email })
  })
}

export async function listProducts(params?: { q?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.category) qs.set('category', params.category)
  return fetchJson(`/products?${qs.toString()}`)
}

export async function getProduct(id: string) {
  return fetchJson(`/products/${id}`)
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


