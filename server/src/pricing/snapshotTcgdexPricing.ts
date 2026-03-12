/**
 * Écrit les snapshots du jour (capturedDay = today) pour une carte TCGdex.
 * Upsert par (tcgdexCardId, lang, market, variant, capturedDay) pour éviter doublons.
 */

import prisma from '../lib/prisma.js';
import { PriceMarket } from '@prisma/client';
import type { MarketPricing } from './normalizeTcgdexPricing.js';
import logger from '../utils/logger.js';
import { getUtcDay } from '../utils/date.js';

export async function upsertTcgdexSnapshots(
  tcgdexCardId: string,
  lang: string,
  marketPricing: MarketPricing
): Promise<void> {
  const capturedDay = getUtcDay();
  const capturedAt = new Date();

  try {
    const cm = marketPricing.sources.cardmarket;
    if (cm) {
      const sourceUpdatedAt = cm.updatedAt ? new Date(cm.updatedAt) : null;
      await upsertOne(
        capturedDay,
        capturedAt,
        tcgdexCardId,
        lang,
        PriceMarket.CARDMARKET,
        'normal',
        cm.currency,
        sourceUpdatedAt,
        {
          low: cm.normal.low,
          avg: cm.normal.avg,
          trend: cm.normal.trend,
          avg1: cm.normal.avg1,
          avg7: cm.normal.avg7,
          avg30: cm.normal.avg30,
          mid: undefined,
          high: undefined,
          marketPrice: undefined,
          directLowPrice: undefined,
        }
      );
      if (cm.holo && (cm.holo.low != null || cm.holo.avg != null || cm.holo.trend != null)) {
        await upsertOne(
          capturedDay,
          capturedAt,
          tcgdexCardId,
          lang,
          PriceMarket.CARDMARKET,
          'holo',
          cm.currency,
          sourceUpdatedAt,
          {
            low: cm.holo.low,
            avg: cm.holo.avg,
            trend: cm.holo.trend,
            avg1: cm.holo.avg1,
            avg7: cm.holo.avg7,
            avg30: cm.holo.avg30,
            mid: undefined,
            high: undefined,
            marketPrice: undefined,
            directLowPrice: undefined,
          }
        );
      }
    }

    const tcp = marketPricing.sources.tcgplayer;
    if (tcp) {
      const sourceUpdatedAt = tcp.updatedAt ? new Date(tcp.updatedAt) : null;
      for (const [variant, v] of Object.entries(tcp.variants)) {
        if (!v || (v.lowPrice == null && v.midPrice == null && v.marketPrice == null)) continue;
        const variantKey = variant || 'normal';
        await upsertOne(
          capturedDay,
          capturedAt,
          tcgdexCardId,
          lang,
          PriceMarket.TCGPLAYER,
          variantKey,
          tcp.currency,
          sourceUpdatedAt,
          {
            low: v.lowPrice,
            avg: undefined,
            trend: v.marketPrice,
            avg1: undefined,
            avg7: undefined,
            avg30: undefined,
            mid: v.midPrice,
            high: v.highPrice,
            marketPrice: v.marketPrice,
            directLowPrice: v.directLowPrice,
          }
        );
      }
    }
  } catch (e) {
    logger.debug('Snapshot TCGdex pricing failed', {
      tcgdexCardId,
      lang,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

type NumericFields = {
  low?: number;
  avg?: number;
  trend?: number;
  avg1?: number;
  avg7?: number;
  avg30?: number;
  mid?: number;
  high?: number;
  marketPrice?: number;
  directLowPrice?: number;
};

async function upsertOne(
  capturedDay: string,
  capturedAt: Date,
  tcgdexCardId: string,
  lang: string,
  market: PriceMarket,
  variant: string,
  currency: string,
  sourceUpdatedAt: Date | null,
  fields: NumericFields
): Promise<void> {
  await prisma.cardPriceSnapshot.upsert({
    where: {
      tcgdexCardId_lang_market_variant_capturedDay: {
        tcgdexCardId,
        lang,
        market,
        variant,
        capturedDay,
      },
    },
    create: {
      tcgdexCardId,
      lang,
      market,
      variant,
      currency,
      capturedDay,
      capturedAt,
      sourceUpdatedAt,
      low: fields.low ?? null,
      avg: fields.avg ?? null,
      trend: fields.trend ?? null,
      avg1: fields.avg1 ?? null,
      avg7: fields.avg7 ?? null,
      avg30: fields.avg30 ?? null,
      mid: fields.mid ?? null,
      high: fields.high ?? null,
      marketPrice: fields.marketPrice ?? null,
      directLowPrice: fields.directLowPrice ?? null,
    },
    update: {
      capturedAt,
      sourceUpdatedAt,
      low: fields.low ?? undefined,
      avg: fields.avg ?? undefined,
      trend: fields.trend ?? undefined,
      avg1: fields.avg1 ?? undefined,
      avg7: fields.avg7 ?? undefined,
      avg30: fields.avg30 ?? undefined,
      mid: fields.mid ?? undefined,
      high: fields.high ?? undefined,
      marketPrice: fields.marketPrice ?? undefined,
      directLowPrice: fields.directLowPrice ?? undefined,
    },
  });
}
