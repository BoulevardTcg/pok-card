-- CreateTable
CREATE TABLE "sale_transactions" (
    "id" TEXT NOT NULL,
    "tcgdexCardId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "condition" TEXT,
    "finish" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sale_transactions_tcgdexCardId_lang_soldAt_idx" ON "sale_transactions"("tcgdexCardId", "lang", "soldAt");
