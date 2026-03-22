import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { syncInventoryFromEbay } from "@/lib/ebay-inventory-sync";
import { normalizeNumeric12_2, optionalNumeric12_2 } from "@/lib/inventory-db-values";
import { inventorySyncErrorResponse } from "@/lib/inventory-sync-errors";

/** Batched INSERT without jsonb payload — moderate batch size keeps transactions reasonable. */
const INSERT_BATCH_SIZE = 120;

function chunkInsertRows<T>(rows: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

/**
 * Inventory sync does many eBay calls; serial runs hit FUNCTION_INVOCATION_TIMEOUT.
 * Pro allows up to 300s; Hobby is capped at 10s (use CSV or a background job for large stores).
 */
export const maxDuration = 300;

/**
 * POST /api/inventory/sync — sync inventory from eBay for the current user.
 * Fetches all inventory items and offers from eBay Inventory API, replaces
 * existing eBay-sourced items in the DB with the synced set.
 */
export async function POST() {
  try {
    const user = await requireUser();
    const rows = await syncInventoryFromEbay(user.id);

    await db.transaction(async (tx) => {
      await tx
        .delete(inventoryItems)
        .where(and(eq(inventoryItems.userId, user.id), eq(inventoryItems.source, "ebay")));

      if (rows.length > 0) {
        const values = rows.map((r) => ({
          userId: user.id,
          sku: r.sku,
          ebayOfferId: r.ebayOfferId,
          ebayListingId: r.ebayListingId,
          listingStatus: r.listingStatus,
          title: r.title,
          quantity: r.quantity,
          price: normalizeNumeric12_2(r.price, "0.00"),
          costOfCard: optionalNumeric12_2(r.costOfCard),
          primaryImageUrl: r.primaryImageUrl,
          condition: r.condition,
          category: r.category,
          source: "ebay" as const,
          rawPayload: null,
        }));
        for (const batch of chunkInsertRows(values, INSERT_BATCH_SIZE)) {
          await tx.insert(inventoryItems).values(batch);
        }
      }
    });

    return NextResponse.json({ count: rows.length });
  } catch (e) {
    console.error("[inventory/sync]", e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(inventorySyncErrorResponse(e), { status: 500 });
  }
}
