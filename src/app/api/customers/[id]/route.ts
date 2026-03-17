import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { getCustomerWithOrders } from "@/lib/customers";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const data = await getCustomerWithOrders(id, user.id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.userId, user.id)),
    });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = (await request.json()) as {
      displayName?: string;
      email?: string;
      notes?: string;
    };
    const update: { displayName?: string | null; email?: string | null; notes?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (body.displayName !== undefined) update.displayName = body.displayName?.trim() || null;
    if (body.email !== undefined) update.email = body.email?.trim() || null;
    if (body.notes !== undefined) update.notes = body.notes?.trim() || null;
    const [updated] = await db
      .update(customers)
      .set(update)
      .where(and(eq(customers.id, id), eq(customers.userId, user.id)))
      .returning();
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
