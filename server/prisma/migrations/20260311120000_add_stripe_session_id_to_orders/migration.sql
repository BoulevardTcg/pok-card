-- AlterTable: add stripeSessionId for webhook idempotency
ALTER TABLE "orders" ADD COLUMN "stripeSessionId" TEXT;

-- CreateIndex: unique constraint to prevent duplicate orders from the same Stripe session
CREATE UNIQUE INDEX "orders_stripeSessionId_key" ON "orders"("stripeSessionId");
