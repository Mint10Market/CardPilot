import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { getInventoryItems } from "@/lib/inventory";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source") as "ebay" | "manual" | null;
    const search = searchParams.get("search") ?? undefined;
    const availability = searchParams.get("availability") as "in_stock" | "sold_out" | null;
    const list = await getInventoryItems(user.id, {
      ...(source === "ebay" || source === "manual" ? { source } : {}),
      search,
      ...(availability === "in_stock" || availability === "sold_out" ? { availability } : {}),
    });
    return NextResponse.json(list);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      title: string;
      sku?: string;
      quantity?: number;
      price: string | number;
      condition?: string;
      category?: string;
      costOfCard?: string | number | null;
      primaryImageUrl?: string | null;
      itemKind?: string | null;
      sportOrTcg?: string | null;
      extraDetails?: Record<string, unknown> | null;
    };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const priceNum = Number(body.price ?? 0);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "price must be a valid non-negative number" }, { status: 400 });
    }
    let costOfCard: string | null = null;
    if (body.costOfCard != null && body.costOfCard !== "") {
      const c = Number(typeof body.costOfCard === "number" ? body.costOfCard : body.costOfCard);
      if (Number.isNaN(c) || c < 0) {
        return NextResponse.json({ error: "costOfCard must be a valid non-negative number" }, { status: 400 });
      }
      costOfCard = c.toFixed(2);
    }
    const extra =
      body.extraDetails != null && typeof body.extraDetails === "object" && !Array.isArray(body.extraDetails)
        ? body.extraDetails
        : null;
    const [created] = await db
      .insert(inventoryItems)
      .values({
        userId: user.id,
        title: body.title.trim(),
        sku: body.sku?.trim() ?? null,
        quantity: Math.max(0, Number(body.quantity) || 0),
        price: String(priceNum),
        costOfCard,
        primaryImageUrl: body.primaryImageUrl?.trim() || null,
        condition: body.condition?.trim() ?? null,
        category: body.category?.trim() ?? null,
        itemKind: body.itemKind?.trim() || null,
        sportOrTcg: body.sportOrTcg?.trim() || null,
        extraDetails: extra,
        source: "manual",
      })
      .returning();
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
