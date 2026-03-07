import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { parsePrice, parseRow } from "@/lib/csv-utils";
import { handleApiError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headerRaw = lines[0] ? parseRow(lines[0]) : [];
    const header = headerRaw.map((h) => h.trim().toLowerCase());
    const titleIdx = header.indexOf("title");
    const skuIdx = header.indexOf("sku") >= 0 ? header.indexOf("sku") : -1;
    const qtyIdx =
      header.indexOf("quantity") >= 0
        ? header.indexOf("quantity")
        : header.indexOf("qty") >= 0
          ? header.indexOf("qty")
          : -1;
    const priceIdx = header.indexOf("price");
    if (titleIdx < 0 || priceIdx < 0) {
      const missing = [
        titleIdx < 0 && "title",
        priceIdx < 0 && "price",
      ].filter(Boolean);
      return NextResponse.json(
        { error: `CSV must include columns: ${missing.join(", ")}` },
        { status: 400 }
      );
    }
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
    return handleApiError(e);
  }
}
