/**
 * Best-effort cost extraction from eBay Inventory API product aspects and description.
 * eBay does not define a standard "cost" field; Card Dealer Pro and similar tools may use custom aspect names.
 */

export const DEFAULT_COST_ASPECT_NAMES = [
  "Cost",
  "Card Cost",
  "Cost of Card",
  "COG",
  "Cost of Goods",
  "Purchase Price",
];

function normalizeAspectKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function aspectValueToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === "string" && v.trim().length > 0);
    return typeof first === "string" ? first.trim() : null;
  }
  return String(value).trim() || null;
}

/**
 * Parse a single monetary amount from free text (first plausible match).
 */
export function parseMoneyFromText(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  // Currency symbols optional; allow commas in thousands
  const patterns = [
    /\$\s*([\d,]+\.?\d*)/,
    /(?:^|\s)([\d,]+\.\d{2})\b/,
    /(?:^|\s)([\d,]+)\b/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const n = Number(String(m[1]).replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 0) return n.toFixed(2);
    }
  }
  return null;
}

/**
 * Read cost from item specifics / aspects when the aspect name matches allowed list (case-insensitive).
 */
export function extractCostFromAspects(
  aspects: Record<string, unknown> | undefined | null,
  allowedNames: readonly string[]
): string | null {
  if (!aspects || typeof aspects !== "object") return null;
  const allowed = new Set(allowedNames.map(normalizeAspectKey));
  for (const [key, raw] of Object.entries(aspects)) {
    if (!allowed.has(normalizeAspectKey(key))) continue;
    const str = aspectValueToString(raw);
    if (!str) continue;
    const parsed = parseMoneyFromText(str);
    if (parsed != null) return parsed;
  }
  return null;
}

/**
 * Fallback: regex on HTML/plain description — e.g. "Cost: $12.34", "COG $12.34".
 */
export function extractCostFromDescription(description: string | undefined | null): string | null {
  if (description == null || typeof description !== "string") return null;
  const plain = description.replace(/<[^>]+>/g, " ");
  const patterns = [
    /\bCost\s*[:=]\s*\$?\s*([\d,]+\.?\d*)/i,
    /\bCOG\s*\$?\s*([\d,]+\.?\d*)/i,
    /\bCard\s+Cost\s*[:=]\s*\$?\s*([\d,]+\.?\d*)/i,
    /\bPurchase\s+(?:Price|Cost)\s*[:=]\s*\$?\s*([\d,]+\.?\d*)/i,
  ];
  for (const re of patterns) {
    const m = plain.match(re);
    if (m?.[1]) {
      const n = Number(String(m[1]).replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 0) return n.toFixed(2);
    }
  }
  return null;
}

function costAspectNamesFromEnv(): string[] {
  const raw = process.env.EBAY_INVENTORY_COST_ASPECT_NAMES;
  if (raw == null || raw.trim() === "") {
    return [...DEFAULT_COST_ASPECT_NAMES];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Aspects first (env + defaults), then description.
 */
export function extractInventoryCost(
  aspects: Record<string, unknown> | undefined | null,
  description: string | undefined | null
): string | null {
  const names = costAspectNamesFromEnv();
  const fromAspects = extractCostFromAspects(aspects, names);
  if (fromAspects != null) return fromAspects;
  return extractCostFromDescription(description);
}
