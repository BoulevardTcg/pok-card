/**
 * Smoke test Boxtal : valide la configuration .env contre l'API en exerçant
 * le vrai code du service (recherche de relais → création d'expédition →
 * suivi + étiquette → annulation).
 *
 * Usage : npx tsx scripts/boxtal-smoke.mts
 * Refuse de tourner contre la production (créerait une étiquette facturée),
 * sauf avec --allow-prod.
 */
import 'dotenv/config';
import { getBoxtalConfig } from '../src/config/boxtal.js';
import {
  searchParcelPoints,
  createShippingOrder,
  getShippingOrderTracking,
  getShippingLabelUrl,
  cancelShippingOrder,
} from '../src/services/boxtal.js';

const config = getBoxtalConfig();
if (!config) {
  console.error('❌ BOXTAL_ACCESS_KEY / BOXTAL_SECRET_KEY manquants dans .env');
  process.exit(1);
}

const isTestEnv = config.baseUrl.includes('boxtal.build');
if (!isTestEnv && !process.argv.includes('--allow-prod')) {
  console.error(
    `❌ ${config.baseUrl} est l'environnement de PRODUCTION : une expédition y serait facturée.\n` +
      '   Relancez avec --allow-prod si c’est volontaire.'
  );
  process.exit(1);
}

console.log(`Environnement : ${config.baseUrl} ${isTestEnv ? '(test, non facturé)' : '(PRODUCTION)'}`);

// 1. Recherche de points relais
console.log('\n1/4 Recherche de points relais autour de 75002 Paris…');
const points = await searchParcelPoints({ postalCode: '75002', city: 'Paris' });
if (points.length === 0) {
  console.error('❌ Aucun point relais retourné — vérifier BOXTAL_SHIPPING_OFFER_CODE_RELAY');
  process.exit(1);
}
console.log(`✅ ${points.length} points trouvés. Premier : ${points[0].name} (${points[0].code})`);

// 2. Création d'une expédition relais
console.log('\n2/4 Création d’une expédition relais de test…');
const shipment = await createShippingOrder({
  externalId: `smoke-${Date.now()}`,
  offerType: 'RELAY',
  pickupPointCode: points[0].code,
  recipient: {
    name: 'Client Test',
    email: 'client.test@example.com',
    phone: '0611223344',
    line1: '1 rue de Rivoli',
    postalCode: '75001',
    city: 'Paris',
    country: 'FR',
  },
  itemsCount: 2,
  valueCents: 2500,
});
console.log(`✅ Expédition créée : ${shipment.boxtalShippingOrderId} (statut ${shipment.status})`);

// 3. Suivi + étiquette (peuvent être différés côté Boxtal)
console.log('\n3/4 Récupération suivi + étiquette…');
const [tracking, labelUrl] = await Promise.all([
  getShippingOrderTracking(shipment.boxtalShippingOrderId),
  getShippingLabelUrl(shipment.boxtalShippingOrderId),
]);
console.log(
  tracking
    ? `✅ Suivi : ${tracking.status ?? '—'} ${tracking.trackingNumber ?? '(numéro pas encore attribué)'}`
    : 'ℹ️ Suivi pas encore disponible (normal juste après création — le webhook le complètera)'
);
console.log(
  labelUrl
    ? `✅ Étiquette : ${labelUrl.slice(0, 80)}…`
    : 'ℹ️ Étiquette pas encore générée (normal juste après création — le webhook la complètera)'
);

// 4. Annulation pour laisser l'environnement propre
console.log('\n4/4 Annulation de l’expédition de test…');
try {
  await cancelShippingOrder(shipment.boxtalShippingOrderId);
  console.log('✅ Expédition annulée');
} catch (err) {
  console.log(
    `ℹ️ Annulation impossible (${(err as Error).message}) — sans conséquence en environnement de test`
  );
}

console.log('\n🎉 Configuration Boxtal opérationnelle.');
