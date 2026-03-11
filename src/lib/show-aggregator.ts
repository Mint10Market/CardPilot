/**
 * Aggregates shows from multiple sources: normalize, dedupe, credibility, hot/cold.
 */
import type { RawShow } from "./show-sources/types";
import type { NewCardShow, NewShowSource } from "./db/schema";

export type NormalizedShow = {
  name: string;
  startDate: Date;
  endDate: Date | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  boothInfo: string | null;
  buyerEntryCost: string | null;
  vendorBoothCost: string | null;
  vendorCount: number | null;
  sourceContributions: Array<{ sourceName: string; externalId: string; raw?: RawShow }>;
};

function normalize(raw: RawShow): Omit<NormalizedShow, "sourceContributions"> {
  return {
    name: String(raw.name ?? "").trim(),
    startDate: raw.startDate instanceof Date ? raw.startDate : new Date(raw.startDate),
    endDate: raw.endDate
      ? raw.endDate instanceof Date
        ? raw.endDate
        : new Date(raw.endDate)
      : null,
    venue: raw.venue?.trim() ?? null,
    address: raw.address?.trim() ?? null,
    city: raw.city?.trim() ?? null,
    state: raw.state?.trim() ?? null,
    country: raw.country?.trim() || "US",
    timezone: raw.timezone?.trim() ?? null,
    organizerName: raw.organizerName?.trim() ?? null,
    organizerEmail: raw.organizerEmail?.trim() ?? null,
    organizerPhone: raw.organizerPhone?.trim() ?? null,
    boothInfo: raw.boothInfo?.trim() ?? null,
    buyerEntryCost: raw.buyerEntryCost?.trim() ?? null,
    vendorBoothCost: raw.vendorBoothCost?.trim() ?? null,
    vendorCount: raw.vendorCount != null ? Number(raw.vendorCount) : null,
  };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function dedupeKey(n: Omit<NormalizedShow, "sourceContributions">): string {
  const name = slug(n.name);
  const date = n.startDate.toISOString().slice(0, 10);
  const place = [n.city, n.state].filter(Boolean).join(", ");
  return `${name}|${date}|${slug(place)}`;
}

/**
 * Deduplicate: same show listed in multiple sources → one canonical show with merged sources.
 */
export function aggregateShows(
  sourceResults: Array<{ sourceName: string; raws: RawShow[] }>
): NormalizedShow[] {
  const map = new Map<string, NormalizedShow>();

  for (const { sourceName, raws } of sourceResults) {
    for (const raw of raws) {
      const norm = normalize(raw);
      const key = dedupeKey(norm);
      const existing = map.get(key);
      if (existing) {
        existing.sourceContributions.push({
          sourceName,
          externalId: raw.externalId,
          raw,
        });
        if (raw.vendorCount != null && existing.vendorCount == null)
          existing.vendorCount = Number(raw.vendorCount);
        if (raw.boothInfo && !existing.boothInfo) existing.boothInfo = raw.boothInfo.trim();
        if (raw.buyerEntryCost && !existing.buyerEntryCost)
          existing.buyerEntryCost = raw.buyerEntryCost.trim();
        if (raw.vendorBoothCost && !existing.vendorBoothCost)
          existing.vendorBoothCost = raw.vendorBoothCost.trim();
        if (raw.organizerPhone && !existing.organizerPhone)
          existing.organizerPhone = raw.organizerPhone.trim();
      } else {
        map.set(key, {
          ...norm,
          sourceContributions: [{ sourceName, externalId: raw.externalId, raw }],
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Compute hot/cold from vendor count and number of sources.
 */
export function hotColdRating(show: NormalizedShow): "cold" | "warm" | "hot" {
  const v = show.vendorCount ?? 0;
  const sources = show.sourceContributions.length;
  if (v >= 100 || sources >= 3) return "hot";
  if (v >= 50 || sources >= 2) return "warm";
  return "cold";
}

/**
 * Build DB insert payload for card_shows and show_sources.
 * show has no id (DB default); sources take showId from insert result.
 */
export function toDbShow(show: NormalizedShow): {
  show: Omit<NewCardShow, "id">;
  getSources: (showId: string) => NewShowSource[];
} {
  const rating = hotColdRating(show);
  const credibilityScore = show.sourceContributions.length;
  return {
    show: {
      name: show.name,
      startDate: show.startDate,
      endDate: show.endDate,
      venue: show.venue,
      address: show.address,
      city: show.city,
      state: show.state,
      country: show.country,
      timezone: show.timezone,
      organizerName: show.organizerName,
      organizerEmail: show.organizerEmail,
      organizerPhone: show.organizerPhone,
      boothInfo: show.boothInfo,
      buyerEntryCost: show.buyerEntryCost,
      vendorBoothCost: show.vendorBoothCost,
      vendorCount: show.vendorCount,
      credibilityScore,
      hotColdRating: rating,
    },
    getSources: (showId) =>
      show.sourceContributions.map((c) => ({
        showId,
        sourceName: c.sourceName,
        externalId: c.externalId,
        rawPayload: c.raw ?? undefined,
      })),
  };
}
