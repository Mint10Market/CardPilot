-- Migration 0003: add last_sync_* columns to users (eBay sync status).
-- Run this in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run multiple times: IF NOT EXISTS is implied by ADD COLUMN (errors if column exists).

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_sync_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_sync_status" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_sync_count" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_sync_error" text;
