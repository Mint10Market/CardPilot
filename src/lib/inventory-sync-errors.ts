import { safeClientErrorMessage } from "@/lib/safe-client-error";

const DEFAULT_MESSAGE =
  "Could not save inventory after syncing eBay. Try again in a moment.";

export type InventorySyncErrorJson = {
  error: string;
  hint?: string;
};

/**
 * Build a JSON-safe error body for /api/inventory/sync. Inspects the raw thrown message
 * only server-side to attach hints (no SQL text is returned).
 */
export function inventorySyncErrorResponse(e: unknown): InventorySyncErrorJson {
  const raw = e instanceof Error ? e.message : "";
  const error = safeClientErrorMessage(e, DEFAULT_MESSAGE);

  if (/does not exist|undefined column|42703/i.test(raw)) {
    return {
      error,
      hint: "Production database may be missing a migration. Run GitHub Actions → “Apply database migrations” (set DATABASE_URL secret) or npm run db:apply locally. See DEPLOY.md.",
    };
  }
  if (/duplicate key|unique constraint/i.test(raw)) {
    return {
      error,
      hint: /ebay_offer_id/i.test(raw)
        ? "Duplicate eBay offer id in the database. Apply migration 0007 (per-user offer uniqueness) via npm run db:apply or GitHub Actions, then sync again."
        : "Conflict saving rows. Try syncing again; if this continues, contact support.",
    };
  }
  if (/numeric|invalid input syntax|22P02|22003|overflow/i.test(raw)) {
    return {
      error,
      hint: "A listing has a price or cost the database cannot store. Check for invalid or extremely large amounts on eBay.",
    };
  }
  return { error };
}
