import { describe, it, expect } from "vitest";
import { computeCardTransaction } from "./collection-calc";

describe("computeCardTransaction selling fees (exact eBay math)", () => {
  it("matches eBay screenshot: order total $6.83, transaction fees $1.06, ad fee $0.34, total selling fees $1.40", () => {
    const result = computeCardTransaction(
      {
        purcDate: "2025-01-01",
        purcSource: "eBay",
        shippingCost: 0,
        cardPurcPrice: 1,
        qty: 1,
        sellPrice: 5.51,
        soldDate: "2025-03-01",
        stateSold: null,
      },
      {
        shippingUnder20: 1.32,
        shippingOver20: 0,
      }
    );
    expect(result.sellingFees).toBe(1.4);
    expect(result.profitDollars).not.toBeNull();
    expect(result.totalCost).not.toBeNull();
    const sellPrice = 5.51;
    const totalCost = result.totalCost!;
    expect(result.profitDollars).toBe(sellPrice - 1.4 - totalCost);
  });

  it("rounds each fee component to 2 decimals then sums (no floating point drift)", () => {
    const result = computeCardTransaction(
      {
        purcDate: "2025-01-01",
        purcSource: "eBay",
        cardPurcPrice: 10,
        qty: 1,
        sellPrice: 6.83,
        soldDate: "2025-03-01",
      },
      { shippingUnder20: 0, shippingOver20: 0 }
    );
    expect(result.sellingFees).toBe(1.4);
  });
});
