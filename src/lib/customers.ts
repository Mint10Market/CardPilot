import { db } from "@/lib/db";
import { customers, orders } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

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
  });
  return { ...customer, orders: customerOrders };
}
