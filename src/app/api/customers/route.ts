import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { customers, orders, manualSales } from "@/lib/db/schema";
import { eq, and, ilike, asc, sql } from "drizzle-orm";

function n(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const x = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(x) ? x : 0;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const withStats = request.nextUrl.searchParams.get("stats") === "1";
    const list = await db.query.customers.findMany({
      where: search
        ? and(eq(customers.userId, user.id), ilike(customers.identifier, `%${search}%`))
        : eq(customers.userId, user.id),
      orderBy: [asc(sql`coalesce(${customers.displayName}, ${customers.identifier})`)],
    });
    if (!withStats) return NextResponse.json(list);

    const allOrders = await db.query.orders.findMany({
      where: eq(orders.userId, user.id),
      columns: { buyerUsername: true, buyerUserId: true, totalAmount: true },
    });
    const allManual = await db.query.manualSales.findMany({
      where: eq(manualSales.userId, user.id),
      columns: { customerId: true, amount: true },
    });

    const revenueByIdentifier = new Map<string, number>();
    const countByIdentifier = new Map<string, number>();
    for (const o of allOrders) {
      const id = o.buyerUsername ?? o.buyerUserId ?? null;
      if (id) {
        revenueByIdentifier.set(id, (revenueByIdentifier.get(id) ?? 0) + n(o.totalAmount));
        countByIdentifier.set(id, (countByIdentifier.get(id) ?? 0) + 1);
      }
    }
    const revenueByCustomerId = new Map<string, number>();
    const countByCustomerId = new Map<string, number>();
    for (const m of allManual) {
      if (m.customerId) {
        revenueByCustomerId.set(m.customerId, (revenueByCustomerId.get(m.customerId) ?? 0) + n(m.amount));
        countByCustomerId.set(m.customerId, (countByCustomerId.get(m.customerId) ?? 0) + 1);
      }
    }

    const result = list.map((c) => ({
      ...c,
      orderCount:
        (countByIdentifier.get(c.identifier) ?? 0) + (countByCustomerId.get(c.id) ?? 0),
      totalRevenue:
        (revenueByIdentifier.get(c.identifier) ?? 0) + (revenueByCustomerId.get(c.id) ?? 0),
    }));
    return NextResponse.json(result);
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
      identifier: string;
      displayName?: string;
      email?: string;
      notes?: string;
    };
    if (!body.identifier?.trim()) {
      return NextResponse.json({ error: "identifier required" }, { status: 400 });
    }
    const [created] = await db
      .insert(customers)
      .values({
        userId: user.id,
        identifier: body.identifier.trim(),
        displayName: body.displayName?.trim() ?? null,
        email: body.email?.trim() ?? null,
        notes: body.notes?.trim() ?? null,
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
