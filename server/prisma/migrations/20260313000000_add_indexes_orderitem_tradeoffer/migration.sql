-- AddIndex
CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");

-- AddIndex
CREATE INDEX IF NOT EXISTS "trade_offers_creatorId_idx" ON "trade_offers"("creatorId");

-- AddIndex
CREATE INDEX IF NOT EXISTS "trade_offers_receiverId_idx" ON "trade_offers"("receiverId");
