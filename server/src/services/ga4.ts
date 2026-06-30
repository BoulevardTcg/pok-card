// Envoi serveur d'évènements GA4 via la Measurement Protocol.
//
// Utilisé après confirmation d'un paiement Stripe (webhook) pour remonter
// l'évènement `purchase`. Conçu pour être **non bloquant** : un échec ici ne
// doit jamais empêcher la commande d'être créée ni provoquer un retry Stripe.
//
// RGPD : on n'envoie un évènement QUE si un `client_id` GA valide est fourni
// (issu du cookie `_ga`, donc présent uniquement si l'utilisateur a consenti
// aux cookies analytiques). Aucune PII (email, nom, adresse) n'est transmise.

import logger from '../utils/logger.js';

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const SEND_TIMEOUT_MS = 3000;

export type Ga4PurchaseItem = {
  item_id: string;
  item_name: string;
  quantity: number;
  unitPriceCents: number;
};

export type Ga4PurchaseParams = {
  /** Valeur brute du cookie `_ga` ou client_id déjà extrait. */
  clientId: string;
  /** Identifiant de transaction (= orderNumber), pas une PII. */
  transactionId: string;
  valueCents: number;
  currency: string;
  items: Ga4PurchaseItem[];
};

/**
 * Extrait et valide l'identifiant client GA depuis la valeur du cookie `_ga`.
 * Le cookie a la forme `GA1.1.<clientId>` où `clientId = "<random>.<timestamp>"`.
 * Accepte aussi un clientId déjà extrait (`<digits>.<digits>`).
 * Retourne `null` si le format est invalide (valeur forgée, vide, trop longue…),
 * ce qui sert de garde-fou : `client_reference_id` est contrôlé par le client.
 */
export function parseGaClientId(raw: string | undefined | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return null;

  // Retirer un éventuel préfixe "GA1.1." / "GA1.2." …
  const clientId = trimmed.replace(/^GA\d\.\d\./, '');
  if (!/^\d+\.\d+$/.test(clientId)) return null;
  return clientId;
}

/**
 * Envoie un évènement `purchase` à GA4. Fire-and-forget : n'échoue jamais
 * l'appelant, timeout court. Ne logge JAMAIS l'URL (elle contient `api_secret`
 * en query string), uniquement un status / message.
 */
export async function sendGa4Purchase(params: Ga4PurchaseParams): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();

  // Fonctionnalité optionnelle : non configurée → no-op silencieux.
  if (!measurementId || !apiSecret) return;

  const clientId = parseGaClientId(params.clientId);
  if (!clientId) return; // pas de consentement / id invalide → on n'envoie rien

  const body = {
    client_id: clientId,
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: params.transactionId,
          currency: params.currency,
          value: Math.round(params.valueCents) / 100,
          items: params.items.map((item) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            price: Math.round(item.unitPriceCents) / 100,
          })),
        },
      },
    ],
  };

  const url = `${GA4_ENDPOINT}?measurement_id=${encodeURIComponent(
    measurementId
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    // Ne jamais logger `url` (contient api_secret) : status uniquement.
    if (!res.ok) {
      logger.warn('Envoi GA4 purchase non confirmé', {
        type: 'GA4_PURCHASE',
        status: res.status,
        transactionId: params.transactionId,
      });
    }
  } catch (err) {
    logger.warn('Échec envoi GA4 purchase', {
      type: 'GA4_PURCHASE',
      transactionId: params.transactionId,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}
