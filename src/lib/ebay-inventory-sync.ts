/**
 * eBay Inventory API sync: fetch seller's inventory items and offers, normalize for DB.
 */

import { getValidAccessToken } from "./ebay-sync";
import { extractInventoryCost } from "./ebay-cost-extract";

const EBAY_INVENTORY_BASE = "https://api.ebay.com/sell/inventory/v1";
const EBAY_SANDBOX_INVENTORY_BASE = "https://api.sandbox.ebay.com/sell/inventory/v1";

/** eBay Inventory API requires a valid Accept-Language (e.g. en-US). */
const EBAY_INVENTORY_HEADERS = {
  "Accept-Language": "en-US",
} as const;

function getInventoryBase(): string {
  return process.env.EBAY_ENVIRONMENT === "sandbox"
    ? EBAY_SANDBOX_INVENTORY_BASE
    : EBAY_INVENTORY_BASE;
}

function inventoryHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...EBAY_INVENTORY_HEADERS,
  };
}

type InventoryItemsResponse = {
  inventoryItems?: Array<{ sku?: string }>;
  total?: number;
};

type InventoryItemDetail = {
  sku?: string;
  product?: {
    title?: string;
    description?: string;
    imageUrls?: string[];
    aspects?: Record<string, unknown>;
  };
  availability?: {
    shipToLocationAvailability?: { quantity?: number };
    pickupAtLocationAvailability?: Array<{ quantity?: number }>;
  };
  condition?: string;
};

type OfferResponse = {
  offers?: Array<{
    offerId?: string;
    sku?: string;
    availableQuantity?: number;
    pricingSummary?: { price?: { value?: string; currency?: string } };
    listing?: { listingId?: string; listingStatus?: string };
  }>;
};

export type EbayInventoryRow = {
  sku: string | null;
  ebayOfferId: string | null;
  ebayListingId: string | null;
  listingStatus: string | null;
  title: string;
  quantity: number;
  price: string;
  costOfCard: string | null;
  primaryImageUrl: string | null;
  condition: string | null;
  category: string | null;
  rawPayload: Record<string, unknown> | null;
};

async function fetchInventoryItemSkus(
  accessToken: string,
  limit: number,
  offset: number
): Promise<{ skus: string[]; total: number }> {
  const base = getInventoryBase();
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${base}/inventory_item?${params}`, {
    headers: inventoryHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay getInventoryItems failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as InventoryItemsResponse;
  const skus = (data.inventoryItems ?? [])
    .map((i) => i.sku)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
  return { skus, total: data.total ?? skus.length };
}

async function fetchInventoryItem(
  accessToken: string,
  sku: string
): Promise<InventoryItemDetail | null> {
  const base = getInventoryBase();
  const res = await fetch(`${base}/inventory_item/${encodeURIComponent(sku)}`, {
    headers: inventoryHeaders(accessToken),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay getInventoryItem failed: ${res.status} ${err}`);
  }
  return (await res.json()) as InventoryItemDetail;
}

async function fetchOffersForSku(
  accessToken: string,
  sku: string
): Promise<OfferResponse | null> {
  const base = getInventoryBase();
  const params = new URLSearchParams({ sku });
  const res = await fetch(`${base}/offer?${params}`, {
    headers: inventoryHeaders(accessToken),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`eBay getOffers failed: ${res.status} ${err}`);
  }
  return (await res.json()) as OfferResponse;
}

function quantityFromItem(item: InventoryItemDetail): number {
  const q = item.availability?.shipToLocationAvailability?.quantity;
  if (typeof q === "number" && Number.isFinite(q)) return Math.max(0, q);
  const pickups = item.availability?.pickupAtLocationAvailability;
  if (Array.isArray(pickups)) {
    const sum = pickups.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    return Math.max(0, sum);
  }
  return 0;
}

/**
 * Run async work over items with a bounded concurrency (avoids serial SKU loops that exceed serverless timeouts).
 */
async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runWorker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await worker(items[i]!, i);
    }
  };
  const n = Math.min(Math.max(1, concurrency), Math.max(1, items.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

function inventorySkuConcurrency(): number {
  const raw = process.env.EBAY_INVENTORY_SYNC_CONCURRENCY;
  const parsed = raw != null ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed >= 1) return Math.min(25, Math.floor(parsed));
  return 12;
}

/** Keep JSON small so batched INSERTs stay under pooler / max query size limits. */
const SLIM_DESCRIPTION_MAX = 6000;
const SLIM_IMAGE_URLS_MAX = 8;

function buildSlimInventoryRawPayload(
  sku: string,
  item: InventoryItemDetail | null,
  offers: NonNullable<OfferResponse["offers"]>
): Record<string, unknown> | null {
  if (!item && offers.length === 0) return null;

  const slimOffers = offers.map((o) => ({
    offerId: o.offerId,
    sku: o.sku,
    availableQuantity: o.availableQuantity,
    pricingSummary: o.pricingSummary,
    listing: o.listing,
  }));

  if (!item) {
    return { sku, offers: slimOffers };
  }

  const product = item.product;
  let description: string | undefined;
  if (product?.description && typeof product.description === "string") {
    const d = product.description;
    description = d.length > SLIM_DESCRIPTION_MAX ? `${d.slice(0, SLIM_DESCRIPTION_MAX)}…` : d;
  }

  return {
    sku,
    item: {
      sku: item.sku,
      condition: item.condition,
      availability: item.availability,
      product: product
        ? {
            title: product.title,
            imageUrls: Array.isArray(product.imageUrls)
              ? product.imageUrls.slice(0, SLIM_IMAGE_URLS_MAX)
              : undefined,
            aspects: product.aspects,
            description,
          }
        : undefined,
    },
    offers: slimOffers,
  };
}

async function fetchRowForSku(
  accessToken: string,
  sku: string
): Promise<EbayInventoryRow | null> {
  try {
    const [item, offersRes] = await Promise.all([
      fetchInventoryItem(accessToken, sku),
      fetchOffersForSku(accessToken, sku),
    ]);
    const title = item?.product?.title?.trim() || `eBay item ${sku}`;
    const quantity = item ? quantityFromItem(item) : 0;
    const condition = item?.condition?.trim() ?? null;

    const offers = offersRes?.offers ?? [];
    const firstOffer = offers[0];
    const price =
      firstOffer?.pricingSummary?.price?.value != null
        ? String(Number(firstOffer.pricingSummary.price.value))
        : "0";
    const ebayOfferId = firstOffer?.offerId ?? null;
    const ebayListingId =
      firstOffer?.listing?.listingId != null && firstOffer.listing.listingId !== ""
        ? String(firstOffer.listing.listingId)
        : null;
    const listingStatus =
      firstOffer?.listing?.listingStatus != null && firstOffer.listing.listingStatus !== ""
        ? String(firstOffer.listing.listingStatus)
        : null;

    const product = item?.product;
    const imageUrls = product?.imageUrls;
    const primaryImageUrl =
      Array.isArray(imageUrls) && imageUrls.length > 0 && typeof imageUrls[0] === "string"
        ? imageUrls[0].trim() || null
        : null;
    const aspects =
      product?.aspects != null && typeof product.aspects === "object"
        ? (product.aspects as Record<string, unknown>)
        : null;
    const description = product?.description;
    const costParsed = extractInventoryCost(aspects, description);
    const costOfCard = costParsed;

    return {
      sku,
      ebayOfferId,
      ebayListingId,
      listingStatus,
      title,
      quantity,
      price,
      costOfCard,
      primaryImageUrl,
      condition,
      category: null,
      rawPayload:
        item != null || offers.length > 0
          ? buildSlimInventoryRawPayload(sku, item, offers)
          : null,
    };
  } catch (e) {
    console.error(`eBay inventory item ${sku}:`, e);
    return null;
  }
}

/**
 * Fetch all inventory items and their offers for the given user, normalize to rows for DB.
 */
export async function syncInventoryFromEbay(userId: string): Promise<EbayInventoryRow[]> {
  const accessToken = await getValidAccessToken(userId);
  const limit = 100;
  let offset = 0;
  const allSkus: string[] = [];

  while (true) {
    const { skus } = await fetchInventoryItemSkus(accessToken, limit, offset);
    allSkus.push(...skus);
    if (skus.length < limit) break;
    offset += limit;
  }

  const uniqueSkus = [...new Set(allSkus)];

  const concurrency = inventorySkuConcurrency();
  const partial = await mapPool(uniqueSkus, concurrency, (sku) =>
    fetchRowForSku(accessToken, sku)
  );

  const rows = partial.filter((r): r is EbayInventoryRow => r != null);

  // One row per ebay_offer_id (global unique) — duplicate SKUs / offer IDs would break INSERT.
  const byOfferId = new Map<string, EbayInventoryRow>();
  const withoutOffer: EbayInventoryRow[] = [];
  for (const r of rows) {
    if (r.ebayOfferId) {
      if (!byOfferId.has(r.ebayOfferId)) byOfferId.set(r.ebayOfferId, r);
    } else {
      withoutOffer.push(r);
    }
  }

  return [...byOfferId.values(), ...withoutOffer];
}
