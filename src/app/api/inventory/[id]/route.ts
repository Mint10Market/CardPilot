import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await _request.json()) as {
      title?: string;
      sku?: string;
      quantity?: number;
      price?: string | number;
      condition?: string;
      category?: string;
    };
    const existing = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.source !== "manual") {
      return NextResponse.json(
        { error: "eBay-sourced items must be edited on eBay" },
        { status: 400 }
      );
    }
    const [updated] = await db
      .update(inventoryItems)
      .set({
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.sku !== undefined && { sku: body.sku.trim() || null }),
        ...(body.quantity !== undefined && { quantity: Math.max(0, Number(body.quantity)) }),
        ...(body.price !== undefined && { price: String(body.price) }),
        ...(body.condition !== undefined && { condition: body.condition?.trim() || null }),
        ...(body.category !== undefined && { category: body.category?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)))
      .returning();
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.source !== "manual") {
      return NextResponse.json(
        { error: "eBay-sourced items cannot be deleted here" },
        { status: 400 }
      );
    }
    await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
