import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category")?.trim() || undefined;

    const conditions = [eq(expenses.userId, user.id)];
    if (category) conditions.push(eq(expenses.category, category));

    const list = await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      expenseName?: string;
      category?: string;
      expenseDate?: string;
      amount?: string | number;
    };
    const name = (body.expenseName ?? "").trim();
    const category = (body.category ?? "").trim();
    const dateStr = body.expenseDate;
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount ?? 0));
    if (!name) return NextResponse.json({ error: "expenseName required" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });
    if (!dateStr) return NextResponse.json({ error: "expenseDate required" }, { status: 400 });
    const expenseDate = new Date(dateStr);
    if (Number.isNaN(expenseDate.getTime()))
      return NextResponse.json({ error: "Invalid expenseDate" }, { status: 400 });
    if (!Number.isFinite(amount))
      return NextResponse.json({ error: "amount required" }, { status: 400 });

    const [created] = await db
      .insert(expenses)
      .values({
        userId: user.id,
        expenseName: name,
        category,
        expenseDate,
        amount: String(amount),
      })
      .returning();
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
