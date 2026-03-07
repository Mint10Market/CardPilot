import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";

/**
 * Parse a CSV line respecting quoted fields and escaped quotes ("" → ").
 * RFC 4180: quotes inside a quoted field are escaped by doubling.
 */
function parseRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === "," || c === "\n") {
        out.push(cur.trim());
        cur = "";
        if (c === "\n") break;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Normalize price to a valid decimal string (at most one decimal point).
 * Invalid input (e.g. "1.2.3") is coerced to a valid form (e.g. "1.2") or "0".
 */
function parsePrice(raw: string): string {
  const stripped = raw.replace(/[^0-9.]/g, "");
  const parts = stripped.split(".");
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) return "0";
  if (parts.length === 1) return stripped;
  const integerPart = parts[0] || "0";
  const decimalPart = parts.slice(1).join("").slice(0, 2);
  const combined = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  const num = parseFloat(combined);
  if (Number.isNaN(num)) return "0.00";
  return num.toFixed(2);
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = lines[0]?.toLowerCase().split(",").map((h) => h.trim()) ?? [];
    const titleIdx = header.indexOf("title") >= 0 ? header.indexOf("title") : 0;
    const skuIdx = header.indexOf("sku") >= 0 ? header.indexOf("sku") : -1;
    const qtyIdx =
      header.indexOf("quantity") >= 0
        ? header.indexOf("quantity")
        : header.indexOf("qty") >= 0
          ? header.indexOf("qty")
          : -1;
    const priceIdx = header.indexOf("price") >= 0 ? header.indexOf("price") : 1;
    const conditionIdx = header.indexOf("condition") >= 0 ? header.indexOf("condition") : -1;
    const categoryIdx = header.indexOf("category") >= 0 ? header.indexOf("category") : -1;

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      const title = cells[titleIdx]?.trim();
      if (!title) continue;
      const price = parsePrice(cells[priceIdx]?.trim() ?? "0");
      await db.insert(inventoryItems).values({
        userId: user.id,
        title,
        sku: skuIdx >= 0 ? cells[skuIdx]?.trim() || null : null,
        quantity: Math.max(0, parseInt(cells[qtyIdx] ?? "0", 10) || 0),
        price,
        condition: conditionIdx >= 0 ? cells[conditionIdx]?.trim() || null : null,
        category: categoryIdx >= 0 ? cells[categoryIdx]?.trim() || null : null,
        source: "manual",
      });
      imported++;
    }
    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
