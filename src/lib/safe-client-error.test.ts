import { describe, expect, it } from "vitest";
import { safeClientErrorMessage } from "./safe-client-error";

describe("safeClientErrorMessage", () => {
  it("returns fallback for Failed query insert", () => {
    expect(
      safeClientErrorMessage(
        new Error('Failed query: insert into "inventory_items" ...'),
        "fallback"
      )
    ).toBe("fallback");
  });

  it("returns fallback for Failed query delete", () => {
    expect(
      safeClientErrorMessage(
        new Error('Failed query: delete from "inventory_items" where ...'),
        "fallback"
      )
    ).toBe("fallback");
  });

  it("returns fallback for delete from with quoted table (no Failed query prefix)", () => {
    expect(
      safeClientErrorMessage(
        new Error('delete from "inventory_items" — constraint violation'),
        "fallback"
      )
    ).toBe("fallback");
  });

  it("returns fallback for update with quoted table", () => {
    expect(
      safeClientErrorMessage(new Error('update "users" set ...'), "fallback")
    ).toBe("fallback");
  });

  it("returns original message for short non-SQL errors", () => {
    expect(safeClientErrorMessage(new Error("eBay token expired"), "fallback")).toBe(
      "eBay token expired"
    );
  });

  it("returns fallback for very long messages", () => {
    const long = "x".repeat(900);
    expect(safeClientErrorMessage(new Error(long), "fallback")).toBe("fallback");
  });
});
