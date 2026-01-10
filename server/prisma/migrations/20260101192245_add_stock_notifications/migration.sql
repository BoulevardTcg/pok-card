-- CreateTable
CREATE TABLE "stock_notifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "stock_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_notifications_productId_idx" ON "stock_notifications"("productId");

-- CreateIndex
CREATE INDEX "stock_notifications_email_idx" ON "stock_notifications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stock_notifications_email_productId_variantId_key" ON "stock_notifications"("email", "productId", "variantId");
