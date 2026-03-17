import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and, ilike, asc } from "drizzle-orm";

export type InventoryFilters = {
  source?: "ebay" | "manual";
  search?: string;
};

export async function getInventoryItems(userId: string, filters: InventoryFilters = {}) {
  const conditions = [eq(inventoryItems.userId, userId)];
  if (filters.source) {
    conditions.push(eq(inventoryItems.source, filters.source));
  }
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      ilike(inventoryItems.title, term)
      // Could add: or(ilike(inventoryItems.sku, term), ...)
    );
  }
  return db.query.inventoryItems.findMany({
    where: and(...conditions),
    orderBy: [asc(inventoryItems.title), asc(inventoryItems.id)],
  });
}

export async function getInventoryItem(id: string, userId: string) {
  return db.query.inventoryItems.findFirst({
    where: and(
      eq(inventoryItems.id, id),
      eq(inventoryItems.userId, userId)
    ),
  });
}
