CREATE TABLE "personal_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"year" text,
	"set_name" text,
	"player_or_subject" text,
	"notes" text,
	"acquired_date" timestamp with time zone,
	"estimated_value" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personal_collection_items" ADD CONSTRAINT "personal_collection_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Allow users without eBay (app-only); add display name for Settings.
ALTER TABLE "users" ALTER COLUMN "ebay_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "access_token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "refresh_token" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "token_expires_at" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;
--> statement-breakpoint
-- Add seller shipping cost to orders for profit calculation (eBay lineItems.deliveryCost.shippingCost).
ALTER TABLE "orders" ADD COLUMN "shipping_cost" numeric(12, 2);
