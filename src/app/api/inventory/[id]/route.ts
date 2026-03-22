import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

function parseExtraDetails(
  raw: unknown
): Record<string, unknown> | undefined | "invalid" {
  if (raw === undefined) return undefined;
  if (raw === null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return {};
    try {
      const parsed = JSON.parse(s) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return "invalid";
    } catch {
      return "invalid";
    }
  }
  return "invalid";
}

function normalizeCost(raw: string | number | null | undefined): string | null | "invalid" {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n.toFixed(2);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)),
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

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
      costOfCard?: string | number | null;
      cost_of_card?: string | number | null;
      primaryImageUrl?: string | null;
      primary_image_url?: string | null;
      itemKind?: string | null;
      item_kind?: string | null;
      sportOrTcg?: string | null;
      sport_or_tcg?: string | null;
      extraDetails?: unknown;
      extra_details?: unknown;
    };
    const existing = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const costRaw = body.costOfCard ?? body.cost_of_card;
    const extraRaw = body.extraDetails ?? body.extra_details;
    const parsedExtra = parseExtraDetails(extraRaw);
    if (parsedExtra === "invalid") {
      return NextResponse.json({ error: "extraDetails must be a JSON object" }, { status: 400 });
    }

    if (existing.source === "ebay") {
      const blocked = [
        body.title !== undefined,
        body.sku !== undefined,
        body.quantity !== undefined,
        body.price !== undefined,
        body.condition !== undefined,
        body.category !== undefined,
        body.primaryImageUrl !== undefined,
        body.primary_image_url !== undefined,
        body.itemKind !== undefined,
        body.item_kind !== undefined,
        body.sportOrTcg !== undefined,
        body.sport_or_tcg !== undefined,
      ].some(Boolean);
      if (blocked) {
        return NextResponse.json(
          { error: "eBay listings: only cost and extra details can be edited here; change title, price, quantity, etc. on eBay." },
          { status: 400 }
        );
      }
      if (costRaw === undefined && parsedExtra === undefined) {
        return NextResponse.json(
          { error: "No allowed fields to update (costOfCard and/or extraDetails)" },
          { status: 400 }
        );
      }
      const costNorm = costRaw !== undefined ? normalizeCost(costRaw) : undefined;
      if (costNorm === "invalid") {
        return NextResponse.json({ error: "costOfCard must be a valid non-negative number" }, { status: 400 });
      }
      const [updated] = await db
        .update(inventoryItems)
        .set({
          ...(costNorm !== undefined && { costOfCard: costNorm }),
          ...(parsedExtra !== undefined && { extraDetails: parsedExtra }),
          updatedAt: new Date(),
        })
        .where(and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)))
        .returning();
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(updated);
    }

    // manual
    const costNormManual =
      costRaw !== undefined ? normalizeCost(costRaw) : undefined;
    if (costNormManual === "invalid") {
      return NextResponse.json({ error: "costOfCard must be a valid non-negative number" }, { status: 400 });
    }
    const img =
      body.primaryImageUrl !== undefined
        ? body.primaryImageUrl?.trim() || null
        : body.primary_image_url !== undefined
          ? body.primary_image_url?.trim() || null
          : undefined;
    const itemKind =
      body.itemKind !== undefined
        ? body.itemKind?.trim() || null
        : body.item_kind !== undefined
          ? body.item_kind?.trim() || null
          : undefined;
    const sportOrTcg =
      body.sportOrTcg !== undefined
        ? body.sportOrTcg?.trim() || null
        : body.sport_or_tcg !== undefined
          ? body.sport_or_tcg?.trim() || null
          : undefined;

    const [updated] = await db
      .update(inventoryItems)
      .set({
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.sku !== undefined && { sku: body.sku.trim() || null }),
        ...(body.quantity !== undefined && { quantity: Math.max(0, Number(body.quantity)) }),
        ...(body.price !== undefined && { price: String(body.price) }),
        ...(body.condition !== undefined && { condition: body.condition?.trim() || null }),
        ...(body.category !== undefined && { category: body.category?.trim() || null }),
        ...(costNormManual !== undefined && { costOfCard: costNormManual }),
        ...(img !== undefined && { primaryImageUrl: img }),
        ...(itemKind !== undefined && { itemKind }),
        ...(sportOrTcg !== undefined && { sportOrTcg }),
        ...(parsedExtra !== undefined && { extraDetails: parsedExtra }),
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryItems.id, id), eq(inventoryItems.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
