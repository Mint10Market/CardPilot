import { db } from "@/lib/db";
import { customers, orders, manualSales } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

/** Shipping address from eBay Fulfillment API order rawPayload */
type ShipToAddress = {
  city?: string | null;
  stateOrProvince?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
};

function deriveLocationFromOrder(
  rawPayload: unknown
): { city: string | null; stateOrProvince: string | null; countryCode: string | null } | null {
  const raw = rawPayload as {
    fulfillmentStartInstructions?: Array<{
      shippingStep?: { shipTo?: { contactAddress?: ShipToAddress } };
    }>;
  } | null;
  const addr = raw?.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo?.contactAddress;
  if (!addr) return null;
  const city = addr.city?.trim() || null;
  const stateOrProvince = addr.stateOrProvince?.trim() || null;
  const countryCode = addr.countryCode?.trim() || null;
  if (!city && !stateOrProvince && !countryCode) return null;
  return { city, stateOrProvince, countryCode };
}

export type CustomerLocation = {
  city: string | null;
  stateOrProvince: string | null;
  countryCode: string | null;
} | null;

export type CustomerStats = {
  orderCount: number;
  totalRevenue: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  averageOrderValue: number;
};

export async function getCustomerWithOrders(customerId: string, userId: string) {
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.userId, userId)),
  });
  if (!customer) return null;

  const customerOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.userId, userId),
      or(
        eq(orders.buyerUsername, customer.identifier),
        eq(orders.buyerUserId, customer.identifier)
      )
    ),
    orderBy: (o, { desc }) => [desc(o.orderDate)],
    columns: {
      id: true,
      orderDate: true,
      totalAmount: true,
      status: true,
      ebayOrderId: true,
      rawPayload: true,
    },
  });

  const manual = await db.query.manualSales.findMany({
    where: and(
      eq(manualSales.userId, userId),
      eq(manualSales.customerId, customer.id)
    ),
    orderBy: (m, { desc }) => [desc(m.saleDate)],
    columns: { id: true, saleDate: true, amount: true, notes: true },
  });

  const n = (v: string | number | null | undefined): number => {
    if (v == null || v === "") return 0;
    const x = typeof v === "string" ? parseFloat(v) : v;
    return Number.isFinite(x) ? x : 0;
  };

  const ebayAmounts = customerOrders.map((o) => n(o.totalAmount));
  const manualAmounts = manual.map((m) => n(m.amount));
  const allAmounts = [...ebayAmounts, ...manualAmounts];
  const totalRevenue = allAmounts.reduce((s, a) => s + a, 0);
  const orderCount = customerOrders.length + manual.length;

  const ebayDates = customerOrders.map((o) => (o.orderDate instanceof Date ? o.orderDate : new Date(o.orderDate)).toISOString());
  const manualDates = manual.map((m) => (m.saleDate instanceof Date ? m.saleDate : new Date(m.saleDate)).toISOString());
  const allDates = [...ebayDates, ...manualDates].sort();
  const firstOrderDate = allDates.length > 0 ? allDates[0]! : null;
  const lastOrderDate = allDates.length > 0 ? allDates[allDates.length - 1]! : null;
  const averageOrderValue = orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;

  let location: CustomerLocation = null;
  for (const o of customerOrders) {
    const loc = deriveLocationFromOrder(o.rawPayload);
    if (loc) {
      location = loc;
      break;
    }
  }

  const stats: CustomerStats = {
    orderCount,
    totalRevenue,
    firstOrderDate,
    lastOrderDate,
    averageOrderValue,
  };

  return {
    ...customer,
    orders: customerOrders,
    manualSales: manual,
    stats,
    location,
  };
}
