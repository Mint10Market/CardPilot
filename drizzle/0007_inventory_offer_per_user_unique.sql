-- Scope eBay offer uniqueness per user (global unique on ebay_offer_id caused cross-account conflicts in multi-tenant DBs).
ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_ebay_offer_id_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_user_ebay_offer_uq" ON "inventory_items" ("user_id", "ebay_offer_id") WHERE "ebay_offer_id" IS NOT NULL;
