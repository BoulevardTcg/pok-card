-- AlterTable: add Boxtal shipping fields (shipping order id, label, pickup point)
ALTER TABLE "orders" ADD COLUMN "boxtalShippingOrderId" TEXT;
ALTER TABLE "orders" ADD COLUMN "labelUrl" TEXT;
ALTER TABLE "orders" ADD COLUMN "pickupPointCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "pickupPoint" JSONB;

-- CreateIndex: unique constraint so one Boxtal shipping order maps to one order (webhook lookups)
CREATE UNIQUE INDEX "orders_boxtalShippingOrderId_key" ON "orders"("boxtalShippingOrderId");
