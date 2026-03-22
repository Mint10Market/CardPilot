import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { orders, manualSales } from "@/lib/db/schema";
import { computePeriodTotals } from "@/lib/sales-calc";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    const ebayOrders = await db.query.orders.findMany({
      where: eq(orders.userId, user.id),
      orderBy: (o, { desc }) => [desc(o.orderDate)],
    });
    const manual = await db.query.manualSales.findMany({
      where: eq(manualSales.userId, user.id),
      orderBy: (m, { desc }) => [desc(m.saleDate)],
    });

    const ordersInRange = ebayOrders.filter((o) => {
      const d = o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate);
      return d.getTime() >= fromDate.getTime() && d.getTime() <= toDate.getTime();
    });
    const manualInRange = manual.filter((m) => {
      const d = m.saleDate instanceof Date ? m.saleDate : new Date(m.saleDate);
      return d.getTime() >= fromDate.getTime() && d.getTime() <= toDate.getTime();
    });

    const periodTotals = computePeriodTotals(ordersInRange, manualInRange);

    return NextResponse.json({
      orders: ordersInRange,
      manualSales: manualInRange,
      totalRevenue: periodTotals.totalRevenue,
      periodTotals,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Failed to load sales";
    return NextResponse.json(
      {
        error: message,
        orders: [],
        manualSales: [],
        totalRevenue: 0,
        periodTotals: {
          totalRevenue: 0,
          totalFees: 0,
          totalShippingCost: 0,
          totalSalesTax: 0,
          totalCostOfCard: 0,
          totalDeductions: 0,
          totalNet: 0,
        },
      },
      { status: 500 }
    );
  }
}
