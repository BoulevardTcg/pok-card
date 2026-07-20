// Statut d'affichage côté client : fusionne le statut commande (OrderStatus)
// et le statut logistique (fulfillmentStatus) pour exposer l'étape
// « En préparation » (étiquette créée, colis pas encore remis au transporteur).
export type OrderDisplayStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export function getOrderDisplayStatus(
  status: string,
  fulfillmentStatus?: string | null
): OrderDisplayStatus {
  if (fulfillmentStatus === 'PREPARING' && (status === 'CONFIRMED' || status === 'PENDING')) {
    return 'PREPARING';
  }
  return status as OrderDisplayStatus;
}

// Étapes affichées dans les timelines de suivi (une commande visible est
// toujours au moins confirmée : elle n'est créée qu'après paiement).
export const ORDER_STATUS_TIMELINE: readonly OrderDisplayStatus[] = [
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
];
