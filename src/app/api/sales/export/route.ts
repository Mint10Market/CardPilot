import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { orders, manualSales } from "@/lib/db/schema";
import { computeOrderDeductions } from "@/lib/sales-calc";
import { eq } from "drizzle-orm";

function escapeCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getShippingLabelCost(rawPayload: unknown): number {
  const raw = rawPayload as
    | {
        lineItems?: Array<{
          deliveryCost?: {
            shippingCost?: { value?: string };
          };
        }>;
      }
    | null
    | undefined;
  const items = Array.isArray(raw?.lineItems) ? raw!.lineItems : [];
  let sum = 0;
  for (const li of items) {
    const ship = li?.deliveryCost?.shippingCost?.value;
    const v = typeof ship === "string" ? parseFloat(ship) : NaN;
    if (Number.isFinite(v)) sum += v;
  }
  return Math.round(sum * 100) / 100;
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
      ["Type", "Date", "ID", "Revenue", "Currency", "eBay fees", "Shipping cost", "Deductions", "Net", "Buyer/Customer", "Status", "Notes"],
    ];
    for (const o of ebayOrders) {
      const od = o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate);
      if (!inRange(od)) continue;
      const amt = parseFloat(String(o.totalAmount));
      const raw = o.rawPayload as { pricingSummary?: { deliveryCost?: { value?: string } } } | null | undefined;
      const shipToBuyer =
        raw?.pricingSummary?.deliveryCost?.value != null
          ? parseFloat(raw.pricingSummary.deliveryCost.value)
          : 0;
      const shippingLabelCost = getShippingLabelCost(o.rawPayload);
      const hasLineItems = Array.isArray((o.rawPayload as unknown as { lineItems?: unknown }).lineItems);
      const d = computeOrderDeductions({
        orderTotal: amt,
        fees: o.fees,
        shippingCost: hasLineItems ? shippingLabelCost : o.shippingCost,
        useFeeEstimate: true,
        shippingChargedToBuyer: shipToBuyer,
      });
      rows.push([
        "eBay",
        od.toISOString().slice(0, 10),
        o.ebayOrderId ?? o.id,
        String(o.totalAmount),
        o.currency ?? "USD",
        String(d.fees),
        String(d.shippingCost),
        String(d.totalDeductions),
        String(d.net),
        o.buyerUsername ?? o.buyerUserId ?? "",
        o.status ?? "",
        "",
      ]);
    }
    for (const m of manual) {
      const md = m.saleDate instanceof Date ? m.saleDate : new Date(m.saleDate);
      if (!inRange(md)) continue;
      const amt = parseFloat(String(m.amount));
      rows.push([
        "Manual",
        md.toISOString().slice(0, 10),
        m.id,
        String(m.amount),
        "USD",
        "0",
        "0",
        "0",
        String(amt),
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
