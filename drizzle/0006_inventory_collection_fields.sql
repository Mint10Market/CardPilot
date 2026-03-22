-- Inventory: cost, images, eBay listing link, structured metadata
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cost_of_card" numeric(12, 2);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "primary_image_url" text;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "ebay_listing_id" text;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "listing_status" text;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "item_kind" text;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sport_or_tcg" text;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "extra_details" jsonb;

-- Personal collection: align with add-item wizard
ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "item_kind" text;
ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "sport_or_tcg" text;
ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "extra_details" jsonb;
ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "image_url" text;
