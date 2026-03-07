import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { orders, manualSales } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

    const inRange = (d: Date) =>
      d.getTime() >= fromDate.getTime() && d.getTime() <= toDate.getTime();

    const rows: string[][] = [
      ["Type", "Date", "ID", "Amount", "Currency", "Buyer/Customer", "Status", "Notes"],
    ];
    for (const o of ebayOrders) {
      const od = o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate);
      if (!inRange(od)) continue;
      rows.push([
        "eBay",
        od.toISOString().slice(0, 10),
        o.ebayOrderId ?? o.id,
        String(o.totalAmount),
        o.currency ?? "USD",
        o.buyerUsername ?? o.buyerUserId ?? "",
        o.status ?? "",
        "",
      ]);
    }
    for (const m of manual) {
      const md = m.saleDate instanceof Date ? m.saleDate : new Date(m.saleDate);
      if (!inRange(md)) continue;
      rows.push([
        "Manual",
        md.toISOString().slice(0, 10),
        m.id,
        String(m.amount),
        "USD",
        "",
        "",
        m.notes ?? "",
      ]);
    }
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-${fromDate.toISOString().slice(0, 10)}-${toDate.toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
