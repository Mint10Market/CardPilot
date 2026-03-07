/**
 * eBay sync: orders and customer derivation.
 * Call after connect (initial sync) and from a background job (ongoing).
 */

import { db } from "@/lib/db";
import { users, orders, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { refreshEbayAccessToken } from "./ebay-auth";

const EBAY_FULFILLMENT_BASE = "https://api.ebay.com/sell/fulfillment/v1";
const EBAY_SANDBOX_FULFILLMENT_BASE = "https://api.sandbox.ebay.com/sell/fulfillment/v1";

function getFulfillmentBase(): string {
  return process.env.EBAY_ENVIRONMENT === "sandbox"
    ? EBAY_SANDBOX_FULFILLMENT_BASE
    : EBAY_FULFILLMENT_BASE;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { accessToken: true, tokenExpiresAt: true, refreshToken: true },
  });
  if (!user) throw new Error("User not found");
  const expiresAt = new Date(user.tokenExpiresAt).getTime();
  const now = Date.now();
  const fiveMinutesMs = 60 * 5 * 1000;
  if (expiresAt > now + fiveMinutesMs) return user.accessToken;
  const refreshed = await refreshEbayAccessToken(user.refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await db
    .update(users)
    .set({
      accessToken: refreshed.access_token,
      tokenExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return refreshed.access_token;
}

type EbayOrder = {
  orderId?: string;
  creationDate?: string;
  orderFulfillmentStatus?: string;
  buyer?: { username?: string; buyerUserId?: string };
  orderPaymentSummary?: { total?: string; payments?: Array<{ amount?: { value?: string; currency?: string } }> };
  lineItems?: Array<{
    title?: string;
    quantity?: number;
    sku?: string;
    baseUnitPrice?: { value?: string };
  }>;
};

type OrderSearchResponse = {
  orders?: EbayOrder[];
  next?: string;
  total?: number;
};

export async function syncOrdersForUser(userId: string, options?: { daysBack?: number }): Promise<{ count: number }> {
  const accessToken = await getValidAccessToken(userId);
  const daysBack = options?.daysBack ?? 90;
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const filter = `creationdate:[${from.toISOString()}..]`;
  const base = getFulfillmentBase();
  let count = 0;
  let offset = 0;
  const limit = 50;

  while (true) {
    const url = `${base}/order?filter=${encodeURIComponent(filter)}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`eBay getOrders failed: ${res.status} ${err}`);
    }
    const data = (await res.json()) as OrderSearchResponse;
    const list = data.orders ?? [];
    for (const o of list) {
      if (!o.orderId || !o.creationDate) continue;
      const totalAmount = o.orderPaymentSummary?.total ?? o.orderPaymentSummary?.payments?.[0]?.amount?.value ?? "0";
      const lineItems = (o.lineItems ?? []).map((li) => ({
        sku: li.sku,
        title: li.title ?? "",
        quantity: li.quantity ?? 1,
        price: li.baseUnitPrice?.value ?? "0",
      }));
      await db
        .insert(orders)
        .values({
          userId,
          ebayOrderId: o.orderId,
          orderDate: new Date(o.creationDate),
          buyerUsername: o.buyer?.username ?? null,
          buyerUserId: o.buyer?.buyerUserId ?? null,
          status: o.orderFulfillmentStatus ?? "UNKNOWN",
          totalAmount,
          currency: o.orderPaymentSummary?.payments?.[0]?.amount?.currency ?? "USD",
          lineItems,
          rawPayload: o as unknown as Record<string, unknown>,
        })
        .onConflictDoUpdate({
          target: orders.ebayOrderId,
          set: {
            orderDate: new Date(o.creationDate),
            buyerUsername: o.buyer?.username ?? null,
            buyerUserId: o.buyer?.buyerUserId ?? null,
            status: o.orderFulfillmentStatus ?? "UNKNOWN",
            totalAmount,
            lineItems,
            rawPayload: o as unknown as Record<string, unknown>,
            updatedAt: new Date(),
          },
        });
      count++;
      const identifier = o.buyer?.username ?? o.buyer?.buyerUserId ?? null;
      if (identifier) {
        await db
          .insert(customers)
          .values({
            userId,
            identifier,
            displayName: o.buyer?.username ?? undefined,
            source: "ebay",
          })
          .onConflictDoNothing({ target: [customers.userId, customers.identifier] });
      }
    }
    if (list.length < limit) break;
    offset += limit;
  }
  return { count };
}
