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

const FIVE_MINUTES_MS = 60 * 5 * 1000;

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { accessToken: true, tokenExpiresAt: true, refreshToken: true },
  });
  if (!user) throw new Error("User not found");
  const expiresAt = new Date(user.tokenExpiresAt).getTime();
  const now = Date.now();
  const isValidExpiry = Number.isFinite(expiresAt) && expiresAt > now + FIVE_MINUTES_MS;
  if (isValidExpiry) return user.accessToken;
  const refreshed = await refreshEbayAccessToken(user.refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  const updatePayload: {
    accessToken: string;
    tokenExpiresAt: Date;
    updatedAt: Date;
    refreshToken?: string;
  } = {
    accessToken: refreshed.access_token,
    tokenExpiresAt: newExpiresAt,
    updatedAt: new Date(),
  };
  if (refreshed.refresh_token) updatePayload.refreshToken = refreshed.refresh_token;
  await db.update(users).set(updatePayload).where(eq(users.id, userId));
  return refreshed.access_token;
}

// eBay Fulfillment API: Order uses pricingSummary (PricingSummary) and lineItems with lineItemCost
type Amount = { value?: string; currency?: string };
type EbayLineItem = {
  title?: string;
  quantity?: number;
  sku?: string;
  baseUnitPrice?: { value?: string };
  lineItemCost?: Amount;
  discountedLineItemCost?: Amount;
};
type EbayOrder = {
  orderId?: string;
  creationDate?: string;
  orderFulfillmentStatus?: string;
  buyer?: { username?: string; buyerUserId?: string };
  pricingSummary?: {
    total?: Amount | string;
    priceSubtotal?: Amount | string;
    deliveryCost?: Amount | string;
    tax?: Amount | string;
  };
  paymentSummary?: { payments?: Array<{ amount?: Amount }> };
  orderPaymentSummary?: { total?: string; payments?: Array<{ amount?: Amount }> };
  lineItems?: EbayLineItem[];
};

function amountValue(a: Amount | string | undefined): string {
  return typeof a === "string" ? a : a?.value ?? "0";
}

function getOrderTotal(order: EbayOrder): { value: string; currency: string } {
  const currencyFrom = (a: Amount | string | undefined): string =>
    typeof a === "string" ? "USD" : a?.currency ?? "USD";
  const total =
    order.pricingSummary?.total != null
      ? amountValue(order.pricingSummary.total)
      : order.orderPaymentSummary?.total ??
        order.paymentSummary?.payments?.[0]?.amount?.value ??
        order.orderPaymentSummary?.payments?.[0]?.amount?.value ??
        "0";
  const currency =
    order.pricingSummary?.total != null
      ? currencyFrom(order.pricingSummary.total)
      : order.paymentSummary?.payments?.[0]?.amount?.currency ??
        order.orderPaymentSummary?.payments?.[0]?.amount?.currency ??
        "USD";
  return { value: total, currency };
}

/** Unit price for a line item: from lineItemCost (total) / qty, or discountedLineItemCost, or baseUnitPrice */
function getLineItemUnitPrice(li: EbayLineItem): string {
  const qty = Math.max(1, Number(li.quantity) || 1);
  const lineTotal =
    amountValue(li.discountedLineItemCost) ||
    amountValue(li.lineItemCost) ||
    "";
  if (lineTotal && Number(lineTotal) >= 0) {
    const unit = Number(lineTotal) / qty;
    return String(unit.toFixed(2));
  }
  return li.baseUnitPrice?.value ?? "0";
}

type OrderSearchResponse = {
  orders?: EbayOrder[];
  next?: string;
  total?: number;
};

const MAX_DAYS_BACK = 730; // eBay allows up to 2 years

export type SyncProgressEvent =
  | { type: "start"; daysBack: number }
  | { type: "page"; offset: number; countInPage: number; totalSoFar: number }
  | { type: "order"; orderId: string; totalAmount: string; totalSoFar: number }
  | { type: "done"; count: number }
  | { type: "error"; message: string };

export async function syncOrdersForUser(
  userId: string,
  options?: { daysBack?: number; onProgress?: (event: SyncProgressEvent) => void }
): Promise<{ count: number }> {
  const accessToken = await getValidAccessToken(userId);
  const raw = options?.daysBack ?? 90;
  const daysBack = Math.min(MAX_DAYS_BACK, Math.max(1, Number.isFinite(raw) ? raw : 90));
  const onProgress = options?.onProgress;
  onProgress?.({ type: "start", daysBack });

  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  const filter = `creationdate:[${from.toISOString()}..]`;
  const base = getFulfillmentBase();
  let count = 0;
  let offset = 0;
  const limit = 50;

  while (true) {
    const params = new URLSearchParams({
      filter,
      limit: String(limit),
      offset: String(offset),
      fieldGroups: "TAX_BREAKDOWN",
    });
    const url = `${base}/order?${params.toString()}`;
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
      const { value: totalAmount, currency } = getOrderTotal(o);
      const lineItems = (o.lineItems ?? []).map((li) => ({
        sku: li.sku,
        title: li.title ?? "",
        quantity: li.quantity ?? 1,
        price: getLineItemUnitPrice(li),
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
          currency,
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
      onProgress?.({ type: "order", orderId: o.orderId, totalAmount, totalSoFar: count });
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
    onProgress?.({ type: "page", offset, countInPage: list.length, totalSoFar: count });
    if (list.length < limit) break;
    offset += limit;
  }
  onProgress?.({ type: "done", count });
  return { count };
}
