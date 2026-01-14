/**
 * Utilitaires pour gérer le cartId côté frontend
 * Le cartId est stocké dans localStorage et envoyé au backend via le header X-Cart-Id
 */

const CART_ID_STORAGE_KEY = 'cartId';

/**
 * Génère un nouveau cartId
 */
function generateCartId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Récupère le cartId depuis localStorage ou en génère un nouveau
 */
export function getOrCreateCartId(): string {
  let cartId = localStorage.getItem(CART_ID_STORAGE_KEY);

  if (!cartId || !/^[a-f0-9]{32}$/.test(cartId)) {
    cartId = generateCartId();
    localStorage.setItem(CART_ID_STORAGE_KEY, cartId);
  }

  return cartId;
}

/**
 * Récupère les headers nécessaires pour les requêtes de réservation
 * Inclut le token d'authentification (si disponible) et le cartId
 */
export function getReservationHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ajouter le token si l'utilisateur est connecté
  const token = localStorage.getItem('accessToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ajouter le cartId (généré si nécessaire)
  const cartId = getOrCreateCartId();
  headers['X-Cart-Id'] = cartId;

  return headers;
}
