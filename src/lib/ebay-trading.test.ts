import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getOrdersFees } from "./ebay-trading";

describe("ebay-trading", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.EBAY_CLIENT_ID;

  beforeEach(() => {
    process.env.EBAY_CLIENT_ID = "test-app-id";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.EBAY_CLIENT_ID = originalEnv;
  });

  describe("getOrdersFees", () => {
    it("returns empty array when orderIds is empty", async () => {
      const result = await getOrdersFees("token", []);
      expect(result).toEqual([]);
    });

    it("parses GetOrdersResponse and returns orderId and totalFees", async () => {
      const sampleXml = `<?xml version="1.0"?>
<GetOrdersResponse xmlns="urn:ebay:apis:eBLBaseComponents">
  <Ack>Success</Ack>
  <OrderArray>
    <Order>
      <OrderID>12-34567-89012</OrderID>
      <TransactionArray>
        <Transaction>
          <FinalValueFee currencyID="USD">1.20</FinalValueFee>
        </Transaction>
      </TransactionArray>
    </Order>
    <Order>
      <OrderID>22-34567-89013</OrderID>
      <TransactionArray>
        <Transaction>
          <FinalValueFee currencyID="USD">0.85</FinalValueFee>
        </Transaction>
        <Transaction>
          <FinalValueFee currencyID="USD">0.42</FinalValueFee>
        </Transaction>
      </TransactionArray>
    </Order>
  </OrderArray>
</GetOrdersResponse>`;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleXml),
      });

      const result = await getOrdersFees("test-token", [
        "12-34567-89012",
        "22-34567-89013",
      ]);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.orderId === "12-34567-89012")).toEqual({
        orderId: "12-34567-89012",
        totalFees: 1.2,
      });
      expect(result.find((r) => r.orderId === "22-34567-89013")).toEqual({
        orderId: "22-34567-89013",
        totalFees: 1.27,
      });
    });
  });
});
