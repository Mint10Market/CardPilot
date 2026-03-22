import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { syncInventoryFromEbay } from "@/lib/ebay-inventory-sync";

/** Large catalogs need more than the default ~10s on Vercel (Pro/Enterprise cap). */
export const maxDuration = 60;

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
            title: r.title,
            quantity: r.quantity,
            price: r.price,
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
