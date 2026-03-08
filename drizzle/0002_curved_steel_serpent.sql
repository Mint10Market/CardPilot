CREATE TABLE "card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purc_date" timestamp with time zone,
	"purc_source" text,
	"shipping_cost" numeric(12, 2) DEFAULT '0',
	"qty" integer,
	"year" text,
	"set_name" text,
	"variation" text,
	"card_type" text,
	"player_character" text,
	"sport" text,
	"team" text,
	"card_notes" text,
	"attributes" text,
	"numbered_to" text,
	"grade" text,
	"grading_company" text,
	"cert_number" text,
	"card_purc_price" numeric(12, 2),
	"sold_date" timestamp with time zone,
	"sell_price" numeric(12, 2),
	"sold_source" text,
	"state_sold" text,
	"fee_type" text,
	"sales_tax" numeric(12, 2),
	"total_cost" numeric(12, 2),
	"suggested_list_price" numeric(12, 2),
	"sell_price_goal" numeric(12, 2),
	"breakeven_ebay" numeric(12, 2),
	"breakeven_other" numeric(12, 2),
	"status" text,
	"selling_fees" numeric(12, 2),
	"profit_dollars" numeric(12, 2),
	"profit_pct" numeric(8, 4),
	"met_goal" text,
	"profit_loss" text,
	"queried_search" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expense_name" text NOT NULL,
	"category" text NOT NULL,
	"expense_date" timestamp with time zone NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"meta" jsonb,
	CONSTRAINT "reference_data_user_id_type_value_unique" UNIQUE("user_id","type","value")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sales_tax_rate" numeric(6, 4) DEFAULT '0',
	"shipping_under_20" numeric(8, 2) DEFAULT '0',
	"shipping_over_20" numeric(8, 2) DEFAULT '0',
	"selling_profit_goal" numeric(6, 4) DEFAULT '0.2',
	"in_stock_status" text DEFAULT 'Available',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_transactions" ADD CONSTRAINT "card_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_data" ADD CONSTRAINT "reference_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;