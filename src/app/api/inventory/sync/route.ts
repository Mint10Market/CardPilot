import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { syncInventoryFromEbay } from "@/lib/ebay-inventory-sync";

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
        await tx.insert(inventoryItems).values(
          rows.map((r) => ({
            userId: user.id,
            sku: r.sku,
            ebayOfferId: r.ebayOfferId,
            ebayListingId: r.ebayListingId,
            listingStatus: r.listingStatus,
            title: r.title,
            quantity: r.quantity,
            price: r.price,
            costOfCard: r.costOfCard,
            primaryImageUrl: r.primaryImageUrl,
            condition: r.condition,
            category: r.category,
            source: "ebay" as const,
            rawPayload: r.rawPayload,
          }))
        );
      }
    });

    return NextResponse.json({ count: rows.length });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
