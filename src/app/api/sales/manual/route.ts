import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { manualSales } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      saleDate: string;
      customerId?: string;
      amount: string | number;
      paymentMethod?: string;
      notes?: string;
      lineItems: Array<{ title: string; quantity: number; price: string; inventoryItemId?: string }>;
    };
    if (!body.saleDate || body.amount == null || !Array.isArray(body.lineItems)) {
      return NextResponse.json(
        { error: "saleDate, amount, and lineItems required" },
        { status: 400 }
      );
    }
    const amountNum = Number(body.amount);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json({ error: "amount must be a valid non-negative number" }, { status: 400 });
    }
    const [created] = await db
      .insert(manualSales)
      .values({
        userId: user.id,
        saleDate: new Date(body.saleDate),
        customerId: body.customerId || null,
        amount: String(amountNum),
        paymentMethod: body.paymentMethod?.trim() || null,
        notes: body.notes?.trim() || null,
        lineItems: body.lineItems.map((li) => ({
          title: li.title,
          quantity: li.quantity ?? 1,
          price: String(Number(li.price ?? 0)),
          inventoryItemId: li.inventoryItemId,
        })),
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
