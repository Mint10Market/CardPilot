import type { ShowSourceAdapter, RawShow } from "./types";

type JsonFeedShow = {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  timezone?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  organizerPhone?: string | null;
  boothInfo?: string | null;
  buyerEntryCost?: string | null;
  vendorBoothCost?: string | null;
  vendorCount?: number | null;
};

export const jsonFeedSourceAdapter: ShowSourceAdapter = {
  name: "json-feed",
  async fetch(): Promise<RawShow[]> {
    const url = process.env.CARD_SHOWS_FEED_URL;
    if (!url) {
      console.warn(
        "CARD_SHOWS_FEED_URL is not set; json-feed show source will return no shows."
      );
      return [];
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(
          "json-feed show source: non-OK response",
          res.status,
          res.statusText
        );
        return [];
      }
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        console.error(
          "json-feed show source: expected an array but got",
          typeof data
        );
        return [];
      }

      return data
        .filter((item): item is JsonFeedShow => {
          return (
            !!item &&
            typeof item === "object" &&
            typeof (item as JsonFeedShow).id === "string" &&
            typeof (item as JsonFeedShow).name === "string" &&
            typeof (item as JsonFeedShow).startDate === "string"
          );
        })
        .map<RawShow>((item) => ({
          externalId: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate ?? null,
          venue: item.venue ?? null,
          address: item.address ?? null,
          city: item.city ?? null,
          state: item.state ?? null,
          country: item.country ?? null,
          timezone: item.timezone ?? null,
          organizerName: item.organizerName ?? null,
          organizerEmail: item.organizerEmail ?? null,
          organizerPhone: item.organizerPhone ?? null,
          boothInfo: item.boothInfo ?? null,
          buyerEntryCost: item.buyerEntryCost ?? null,
          vendorBoothCost: item.vendorBoothCost ?? null,
          vendorCount:
            typeof item.vendorCount === "number" ? item.vendorCount : null,
          raw: item as unknown as Record<string, unknown>,
        }));
    } catch (e) {
      console.error("json-feed show source failed:", e);
      return [];
    }
  },
};

