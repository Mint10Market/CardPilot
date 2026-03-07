import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const customer = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.userId, user.id)),
    });
    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const customerOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.userId, user.id),
        or(
          eq(orders.buyerUsername, customer.identifier),
          eq(orders.buyerUserId, customer.identifier)
        )
      ),
      orderBy: (o, { desc }) => [desc(o.orderDate)],
    });
    return NextResponse.json({ ...customer, orders: customerOrders });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
