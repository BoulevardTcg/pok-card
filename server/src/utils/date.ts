/**
 * Retourne le jour UTC au format YYYY-MM-DD.
 * Utilisé pour CardPriceSnapshot (capturedDay) et agrégations SaleTransaction (boulevard).
 */
export function getUtcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
