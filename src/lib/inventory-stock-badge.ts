/**
 * Single source of truth for inventory list/detail “availability” badges
 * (quantity + eBay listingStatus). Keeps list and detail pages consistent.
 */
export type InventoryStockBadgeInput = {
  source: string;
  quantity: number;
  listingStatus: string | null;
};

export type InventoryStockBadge = {
  label: string;
  className: string;
};

const amber = "bg-amber-500/15 text-amber-800 dark:text-amber-300";
const green = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
const redSoldOut = "bg-red-500/15 text-red-800 dark:text-red-300";

export function inventoryStockBadge(item: InventoryStockBadgeInput): InventoryStockBadge {
  if (item.quantity === 0) {
    return { label: "Sold out", className: redSoldOut };
  }
  if (item.source !== "ebay") {
    return { label: "Available", className: green };
  }
  if (!item.listingStatus) {
    return { label: "Available", className: green };
  }
  const s = item.listingStatus.toUpperCase();
  if (s === "ENDED" || s === "OUT_OF_STOCK") {
    return { label: item.listingStatus, className: amber };
  }
  if (s === "UNPUBLISHED" || s === "INACTIVE") {
    return { label: "Not listed", className: amber };
  }
  return { label: item.listingStatus, className: green };
}
