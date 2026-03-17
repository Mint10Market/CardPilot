/**
 * eBay Trading API client for fetching exact Final Value Fees (FVF) per order.
 * GetOrders with IncludeFinalValueFee returns FVF in Transaction.FinalValueFee.
 * Used after Fulfillment sync to populate orders.fees so the Sales breakdown shows exact fees.
 */

const EBAY_TRADING_PROD = "https://api.ebay.com/ws/api.dll";
const EBAY_TRADING_SANDBOX = "https://api.sandbox.ebay.com/ws/api.dll";

const TRADING_API_VERSION = "1149";
const SITE_ID_US = "0";

function getTradingEndpoint(): string {
  return process.env.EBAY_ENVIRONMENT === "sandbox"
    ? EBAY_TRADING_SANDBOX
    : EBAY_TRADING_PROD;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build GetOrders request XML with OrderIDArray and IncludeFinalValueFee.
 * Passes OAuth token in RequesterCredentials for Trading API.
 */
function buildGetOrdersXml(orderIds: string[], authToken: string): string {
  const orderIdTags = orderIds
    .slice(0, 100)
    .map((id) => `<OrderID>${escapeXml(id)}</OrderID>`)
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${escapeXml(authToken)}</eBayAuthToken>
  </RequesterCredentials>
  <IncludeFinalValueFee>true</IncludeFinalValueFee>
  <OrderIDArray>
${orderIdTags}
  </OrderIDArray>
</GetOrdersRequest>`;
}

/**
 * Parse a numeric value from FinalValueFee (may have currencyID attribute).
 */
function parseFeeValue(text: string): number {
  const trimmed = (text || "").trim();
  if (!trimmed) return 0;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Extract orderId and sum of FinalValueFee from an Order XML block.
 * Handles default namespace (no prefix) and optional ebl prefix.
 */
function parseOrderBlock(orderBlock: string): { orderId: string; totalFees: number } | null {
  const orderIdMatch = orderBlock.match(/<OrderID[^>]*>([^<]*)<\/OrderID>/i);
  const orderId = orderIdMatch ? orderIdMatch[1].trim() : null;
  if (!orderId) return null;

  const feeMatches = orderBlock.matchAll(/<FinalValueFee[^>]*>([^<]*)<\/FinalValueFee>/gi);
  let totalFees = 0;
  for (const m of feeMatches) {
    totalFees += parseFeeValue(m[1]);
  }
  return { orderId, totalFees };
}

/**
 * Parse GetOrdersResponse XML and return a map of orderId -> total FVF (sum of all transactions).
 */
function parseGetOrdersResponse(xml: string): Map<string, number> {
  const result = new Map<string, number>();

  const ackMatch = xml.match(/<Ack[^>]*>([^<]+)<\/Ack>/i);
  const ack = ackMatch ? ackMatch[1].trim() : "";
  if (ack !== "Success" && ack !== "Warning") {
    const shortMsg = xml.match(/<ShortMessage[^>]*>([^<]*)<\/ShortMessage>/i)?.[1] ?? "Unknown error";
    const longMsg = xml.match(/<LongMessage[^>]*>([^<]*)<\/LongMessage>/i)?.[1];
    throw new Error(`eBay Trading API GetOrders failed: ${ack}. ${shortMsg}${longMsg ? ` ${longMsg}` : ""}`);
  }

  const parts = xml.split(/<(?:[\w]+:)?Order[\s>]/i);
  for (let i = 1; i < parts.length; i++) {
    const orderBlock = (parts[i].split(/<\/(?:[\w]+:)?Order\s*>/i)[0] ?? "").replace(/^[\s>]+/, "");
    const parsed = parseOrderBlock(orderBlock);
    if (parsed) result.set(parsed.orderId, parsed.totalFees);
  }

  return result;
}

export type GetOrdersFeesResult = { orderId: string; totalFees: number }[];

/**
 * Fetch Final Value Fee for the given order IDs via Trading API GetOrders.
 * Returns an array of { orderId, totalFees } for each order that had FVF in the response.
 * Uses the provided OAuth access token (e.g. from getValidAccessToken in ebay-sync).
 */
export async function getOrdersFees(
  accessToken: string,
  orderIds: string[]
): Promise<GetOrdersFeesResult> {
  if (orderIds.length === 0) return [];
  const appName = process.env.EBAY_CLIENT_ID;
  if (!appName) throw new Error("EBAY_CLIENT_ID is required for Trading API");

  const endpoint = getTradingEndpoint();
  const batchSize = 100;
  const all: GetOrdersFeesResult = [];

  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    const body = buildGetOrdersXml(batch, accessToken);
    // Rate limit: avoid bursting Trading API
    if (i > 0) await new Promise((r) => setTimeout(r, 500));
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "X-EBAY-API-CALLNAME": "GetOrders",
        "X-EBAY-API-APP-NAME": appName,
        "X-EBAY-API-VERSION": TRADING_API_VERSION,
        "X-EBAY-API-COMPATIBILITY-LEVEL": TRADING_API_VERSION,
        "X-EBAY-API-SITEID": SITE_ID_US,
      },
      body,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`eBay Trading API GetOrders HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    try {
      const map = parseGetOrdersResponse(text);
      for (const [orderId, totalFees] of map) {
        all.push({ orderId, totalFees });
      }
    } catch (parseErr) {
      throw parseErr instanceof Error ? parseErr : new Error(String(parseErr));
    }
  }

  return all;
}
