/**
 * eBay Inventory API sync: fetch seller's inventory items and offers, normalize for DB.
 */

import { getValidAccessToken } from "./ebay-sync";

const EBAY_INVENTORY_BASE = "https://api.ebay.com/sell/inventory/v1";
const EBAY_SANDBOX_INVENTORY_BASE = "https://api.sandbox.ebay.com/sell/inventory/v1";

function getInventoryBase(): string {
  return process.env.EBAY_ENVIRONMENT === "sandbox"
    ? EBAY_SANDBOX_INVENTORY_BASE
    : EBAY_INVENTORY_BASE;
}

type InventoryItemsResponse = {
  inventoryItems?: Array<{ sku?: string }>;
  total?: number;
};

type InventoryItemDetail = {
  sku?: string;
  product?: { title?: string };
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
  title: string;
  quantity: number;
  price: string;
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
    headers: { Authorization: `Bearer ${accessToken}` },
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
    headers: { Authorization: `Bearer ${accessToken}` },
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
    headers: { Authorization: `Bearer ${accessToken}` },
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

  const rows: EbayInventoryRow[] = [];

  for (const sku of allSkus) {
    try {
      const [item, offersRes] = await Promise.all([
        fetchInventoryItem(accessToken, sku),
        fetchOffersForSku(accessToken, sku),
      ]);
      const title =
        item?.product?.title?.trim() || `eBay item ${sku}`;
      const quantity = item ? quantityFromItem(item) : 0;
      const condition = item?.condition?.trim() ?? null;

      const offers = offersRes?.offers ?? [];
      const firstOffer = offers[0];
      const price =
        firstOffer?.pricingSummary?.price?.value != null
          ? String(Number(firstOffer.pricingSummary.price.value))
          : "0";
      const ebayOfferId = firstOffer?.offerId ?? null;

      rows.push({
        sku,
        ebayOfferId,
        title,
        quantity,
        price,
        condition,
        category: null,
        rawPayload: item
          ? { sku, item: item as unknown as Record<string, unknown>, offers }
          : null,
      });
    } catch (e) {
      console.error(`eBay inventory item ${sku}:`, e);
      // Continue with next SKU
    }
  }

  return rows;
}
