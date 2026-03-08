ALTER TABLE "users" ADD COLUMN "last_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sync_status" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sync_count" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_sync_error" text;