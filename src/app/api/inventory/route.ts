import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const user = await requireUser();
    const list = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.userId, user.id),
      orderBy: (i, { asc }) => [asc(i.title)],
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
    };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const [created] = await db
      .insert(inventoryItems)
      .values({
        userId: user.id,
        title: body.title.trim(),
        sku: body.sku?.trim() ?? null,
        quantity: Math.max(0, Number(body.quantity) || 0),
        price: String(body.price ?? 0),
        condition: body.condition?.trim() ?? null,
        category: body.category?.trim() ?? null,
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
