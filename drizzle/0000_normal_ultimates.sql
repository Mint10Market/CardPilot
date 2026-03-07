CREATE TABLE "card_shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"venue" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'US',
	"timezone" text,
	"organizer_name" text,
	"organizer_email" text,
	"organizer_phone" text,
	"booth_info" text,
	"vendor_count" integer,
	"credibility_score" integer,
	"hot_cold_rating" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"identifier" text NOT NULL,
	"display_name" text,
	"email" text,
	"source" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sku" text,
	"ebay_offer_id" text,
	"title" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"condition" text,
	"category" text,
	"source" text NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_ebay_offer_id_unique" UNIQUE("ebay_offer_id")
);
--> statement-breakpoint
CREATE TABLE "manual_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sale_date" timestamp with time zone NOT NULL,
	"customer_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" text,
	"notes" text,
	"line_items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ebay_order_id" text,
	"order_date" timestamp with time zone NOT NULL,
	"buyer_username" text,
	"buyer_user_id" text,
	"status" text NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD',
	"fees" numeric(12, 2),
	"line_items" jsonb NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_ebay_order_id_unique" UNIQUE("ebay_order_id")
);
--> statement-breakpoint
CREATE TABLE "show_sources" (
	"show_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"external_id" text NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "show_sources_show_id_source_name_external_id_pk" PRIMARY KEY("show_id","source_name","external_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ebay_user_id" text NOT NULL,
	"ebay_username" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_ebay_user_id_unique" UNIQUE("ebay_user_id")
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_sales" ADD CONSTRAINT "manual_sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_sales" ADD CONSTRAINT "manual_sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_sources" ADD CONSTRAINT "show_sources_show_id_card_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."card_shows"("id") ON DELETE cascade ON UPDATE no action;