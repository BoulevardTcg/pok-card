/**
 * Job quotidien (ex: cron 02:00) pour alimenter l'historique de prix TCGdex.
 * Snapshot les cartes présentes dans les favoris (et optionnellement la collection).
 * Usage: npx tsx scripts/snapshot-tcgdex-daily.ts
 */
import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import { normalizeTcgdexPricing } from '../src/pricing/normalizeTcgdexPricing.js';
import { upsertTcgdexSnapshots } from '../src/pricing/snapshotTcgdexPricing.js';

const TCGDEX_LANGS = ['fr', 'en', 'ja'] as const;

async function main() {
  const cardIds = await prisma.favorite
    .findMany({ select: { cardId: true }, distinct: ['cardId'] })
    .then((rows) => [...new Set(rows.map((r) => r.cardId))]);

  const collectionIds = await prisma.userCollection
    .findMany({ select: { cardId: true }, distinct: ['cardId'] })
    .then((rows) => rows.map((r) => r.cardId));

  const allIds = [...new Set([...cardIds, ...collectionIds])];
  if (allIds.length === 0) {
    console.log('Aucune carte à snapshot (favoris + collection vides).');
    await prisma.$disconnect();
    return;
  }

  console.log(`Snapshot de ${allIds.length} cartes (fr, en, ja)...`);
  let ok = 0;
  let err = 0;

  for (const cardId of allIds) {
    for (const lang of TCGDEX_LANGS) {
      try {
        const res = await fetch(
          `https://api.tcgdex.net/v2/${lang}/cards/${encodeURIComponent(cardId)}`
        );
        if (!res.ok) continue;
        const card = (await res.json()) as { pricing?: unknown };
        const marketPricing = normalizeTcgdexPricing(card.pricing);
        if (Object.keys(marketPricing.sources).length === 0) continue;
        await upsertTcgdexSnapshots(cardId, lang, marketPricing);
        ok++;
      } catch (e) {
        err++;
      }
    }
  }

  console.log(`Terminé: ${ok} snapshots écrits, ${err} erreurs.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
