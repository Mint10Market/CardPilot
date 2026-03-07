import { describe, it, expect } from "vitest";
import { parseRow, parsePrice } from "./csv-utils";

describe("parseRow", () => {
  it("splits simple comma-separated values", () => {
    expect(parseRow("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace", () => {
    expect(parseRow("  a  ,  b  ,  c  ")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    expect(parseRow('"hello","world"')).toEqual(["hello", "world"]);
  });

  it("unescapes doubled quotes inside quoted fields (RFC 4180)", () => {
    expect(parseRow('"say ""hi"""')).toEqual(['say "hi"']);
  });

  it("handles comma inside quoted field", () => {
    expect(parseRow('"a,b",c')).toEqual(["a,b", "c"]);
  });

  it("returns single field when no comma", () => {
    expect(parseRow("only")).toEqual(["only"]);
  });

  it("handles empty fields", () => {
    expect(parseRow("a,,c")).toEqual(["a", "", "c"]);
  });
});

describe("parsePrice", () => {
  it("returns valid decimal string for integer", () => {
    expect(parsePrice("42")).toBe("42");
  });

  it("returns two decimal places for decimal input", () => {
    expect(parsePrice("1.5")).toBe("1.50");
    expect(parsePrice("99.9")).toBe("99.90");
  });

  it("strips non-numeric characters", () => {
    expect(parsePrice("$1,234.56")).toBe("1234.56");
  });

  it("coerces invalid multiple decimals", () => {
    expect(parsePrice("1.2.3")).toBe("1.23");
  });

  it("returns 0 for empty or non-numeric", () => {
    expect(parsePrice("")).toBe("0");
    expect(parsePrice("abc")).toBe("0");
  });

  it("returns 0.00 for NaN after coercion", () => {
    expect(parsePrice(".")).toBe("0.00");
  });
});
