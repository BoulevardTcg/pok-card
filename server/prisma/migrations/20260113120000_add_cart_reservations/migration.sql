-- CreateTable
CREATE TABLE "cart_reservations" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_reservations_variantId_idx" ON "cart_reservations"("variantId");

-- CreateIndex
CREATE INDEX "cart_reservations_ownerKey_idx" ON "cart_reservations"("ownerKey");

-- CreateIndex
CREATE INDEX "cart_reservations_expiresAt_idx" ON "cart_reservations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "cart_reservations_variantId_ownerKey_key" ON "cart_reservations"("variantId", "ownerKey");

-- AddForeignKey
ALTER TABLE "cart_reservations" ADD CONSTRAINT "cart_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
