/**
 * Normalize values for inventory_items numeric(12, 2) columns.
 * eBay can return prices as strings that become NaN, Infinity, or scientific notation when coerced.
 */

const MAX_NUMERIC_12_2 = 9_999_999_999.99;

/**
 * Returns a string suitable for Drizzle/pg decimal(12, 2): "0.00" … "9999999999.99".
 */
export function normalizeNumeric12_2(raw: string | null | undefined, fallback = "0.00"): string {
  if (raw == null) return fallback;
  const trimmed = String(raw).trim().replace(/,/g, "");
  if (trimmed === "") return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return fallback;
  const clamped = Math.min(n, MAX_NUMERIC_12_2);
  return (Math.round(clamped * 100) / 100).toFixed(2);
}

/** For nullable DB columns: null if missing or not a valid non-negative amount. */
export function optionalNumeric12_2(raw: string | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null;
  const trimmed = String(raw).trim().replace(/,/g, "");
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  const clamped = Math.min(n, MAX_NUMERIC_12_2);
  return (Math.round(clamped * 100) / 100).toFixed(2);
}
