import { describe, expect, it } from "vitest";
import { normalizeNumeric12_2, optionalNumeric12_2 } from "./inventory-db-values";

describe("normalizeNumeric12_2", () => {
  it("formats valid numbers", () => {
    expect(normalizeNumeric12_2("11.99")).toBe("11.99");
    expect(normalizeNumeric12_2("0")).toBe("0.00");
  });

  it("uses fallback for NaN and Infinity", () => {
    expect(normalizeNumeric12_2("not-a-number")).toBe("0.00");
    expect(normalizeNumeric12_2("Infinity")).toBe("0.00");
  });

  it("clamps to numeric(12,2) max", () => {
    expect(normalizeNumeric12_2("99999999999.99")).toBe("9999999999.99");
  });
});

describe("optionalNumeric12_2", () => {
  it("returns null for invalid", () => {
    expect(optionalNumeric12_2("x")).toBeNull();
    expect(optionalNumeric12_2("")).toBeNull();
  });
});
