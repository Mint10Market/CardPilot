import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const row = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, id), eq(expenses.userId, user.id)),
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as {
      expenseName?: string;
      category?: string;
      expenseDate?: string;
      amount?: string | number;
    };
    const updates: Record<string, string | Date> = { updatedAt: new Date() };
    if (body.expenseName !== undefined) updates.expenseName = String(body.expenseName).trim();
    if (body.category !== undefined) updates.category = String(body.category).trim();
    if (body.expenseDate !== undefined) {
      const d = new Date(body.expenseDate);
      if (!Number.isNaN(d.getTime())) updates.expenseDate = d;
    }
    if (body.amount !== undefined) {
      const n = typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount));
      if (Number.isFinite(n)) updates.amount = String(n);
    }
    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [deleted] = await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)))
      .returning({ id: expenses.id });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
