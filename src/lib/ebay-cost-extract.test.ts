import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  extractCostFromAspects,
  extractCostFromDescription,
  extractInventoryCost,
  parseMoneyFromText,
  DEFAULT_COST_ASPECT_NAMES,
} from "./ebay-cost-extract";

describe("parseMoneyFromText", () => {
  it("parses dollar amounts", () => {
    expect(parseMoneyFromText("$12.34")).toBe("12.34");
    expect(parseMoneyFromText("Cost: 99")).toBe("99.00");
  });
});

describe("extractCostFromAspects", () => {
  it("finds cost by allowed name (case-insensitive)", () => {
    const aspects = { "Card Cost": ["15.50"], Brand: ["Topps"] };
    expect(extractCostFromAspects(aspects, DEFAULT_COST_ASPECT_NAMES)).toBe("15.50");
  });

  it("matches comma-separated env-style names", () => {
    const aspects = { "Cost of Goods": ["$3.25"] };
    expect(extractCostFromAspects(aspects, ["Cost of Goods"])).toBe("3.25");
  });

  it("returns null when no match", () => {
    expect(extractCostFromAspects({ Foo: ["12"] }, ["Cost"])).toBeNull();
  });
});

describe("extractCostFromDescription", () => {
  it("matches Cost: pattern", () => {
    expect(extractCostFromDescription("<p>Cost: $8.00</p>")).toBe("8.00");
    expect(extractCostFromDescription("note Cost: 10.5 end")).toBe("10.50");
  });

  it("matches COG pattern", () => {
    expect(extractCostFromDescription("COG $22")).toBe("22.00");
  });

  it("returns null when absent", () => {
    expect(extractCostFromDescription("Just a listing")).toBeNull();
  });
});

describe("extractInventoryCost", () => {
  const originalEnv = process.env.EBAY_INVENTORY_COST_ASPECT_NAMES;

  beforeEach(() => {
    delete process.env.EBAY_INVENTORY_COST_ASPECT_NAMES;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.EBAY_INVENTORY_COST_ASPECT_NAMES;
    else process.env.EBAY_INVENTORY_COST_ASPECT_NAMES = originalEnv;
  });

  it("prefers aspects over description", () => {
    const aspects = { Cost: ["5.00"] };
    expect(extractInventoryCost(aspects, "Cost: 99.00")).toBe("5.00");
  });

  it("falls back to description", () => {
    expect(extractInventoryCost({}, "Purchase Price: $7.25")).toBe("7.25");
  });

  it("uses EBAY_INVENTORY_COST_ASPECT_NAMES when set", () => {
    vi.stubEnv("EBAY_INVENTORY_COST_ASPECT_NAMES", "Dealer Cost,My COG");
    const aspects = { "Dealer Cost": ["42.00"] };
    expect(extractInventoryCost(aspects, null)).toBe("42.00");
    vi.unstubAllEnvs();
  });
});
