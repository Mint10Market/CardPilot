import { describe, it, expect } from "vitest";
import { inventoryStockBadge } from "./inventory-stock-badge";

describe("inventoryStockBadge", () => {
  it("marks quantity zero as sold out for any source", () => {
    const b = inventoryStockBadge({ source: "ebay", quantity: 0, listingStatus: "ACTIVE" });
    expect(b.label).toBe("Sold out");
  });

  it("treats OUT_OF_STOCK like ENDED for eBay (amber, raw status)", () => {
    const ended = inventoryStockBadge({
      source: "ebay",
      quantity: 2,
      listingStatus: "ENDED",
    });
    const oos = inventoryStockBadge({
      source: "ebay",
      quantity: 2,
      listingStatus: "OUT_OF_STOCK",
    });
    expect(ended.label).toBe("ENDED");
    expect(oos.label).toBe("OUT_OF_STOCK");
    expect(ended.className).toBe(oos.className);
  });

  it("ignores listing status for manual items with stock", () => {
    const b = inventoryStockBadge({
      source: "manual",
      quantity: 1,
      listingStatus: "OUT_OF_STOCK",
    });
    expect(b.label).toBe("Available");
  });

  it("maps UNPUBLISHED to Not listed", () => {
    const b = inventoryStockBadge({
      source: "ebay",
      quantity: 1,
      listingStatus: "UNPUBLISHED",
    });
    expect(b.label).toBe("Not listed");
  });
});
