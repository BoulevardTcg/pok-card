-- CreateEnum
CREATE TYPE "PriceMarket" AS ENUM ('CARDMARKET', 'TCGPLAYER');

-- CreateTable
CREATE TABLE "card_price_snapshots" (
    "id" TEXT NOT NULL,
    "tcgdexCardId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "market" "PriceMarket" NOT NULL,
    "variant" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "low" DOUBLE PRECISION,
    "avg" DOUBLE PRECISION,
    "trend" DOUBLE PRECISION,
    "avg1" DOUBLE PRECISION,
    "avg7" DOUBLE PRECISION,
    "avg30" DOUBLE PRECISION,
    "mid" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "marketPrice" DOUBLE PRECISION,
    "directLowPrice" DOUBLE PRECISION,
    "sourceUpdatedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDay" TEXT NOT NULL,

    CONSTRAINT "card_price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "card_price_snapshots_tcgdexCardId_lang_market_variant_capturedDay_key" ON "card_price_snapshots"("tcgdexCardId", "lang", "market", "variant", "capturedDay");

-- CreateIndex
CREATE INDEX "card_price_snapshots_tcgdexCardId_lang_market_capturedAt_idx" ON "card_price_snapshots"("tcgdexCardId", "lang", "market", "capturedAt");
