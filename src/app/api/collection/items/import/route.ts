import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { personalCollectionItems } from "@/lib/db/schema";
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
    if (titleIdx < 0) {
      return NextResponse.json({ error: "CSV must include a title column" }, { status: 400 });
    }
    const categoryIdx = header.indexOf("category") >= 0 ? header.indexOf("category") : -1;
    const yearIdx = header.indexOf("year") >= 0 ? header.indexOf("year") : -1;
    const setIdx = header.indexOf("set") >= 0 ? header.indexOf("set") : -1;
    const playerIdx =
      header.indexOf("player") >= 0
        ? header.indexOf("player")
        : header.indexOf("player_or_subject") >= 0
          ? header.indexOf("player_or_subject")
          : -1;
    const notesIdx = header.indexOf("notes") >= 0 ? header.indexOf("notes") : -1;
    const acquiredDateIdx =
      header.indexOf("acquired_date") >= 0
        ? header.indexOf("acquired_date")
        : header.indexOf("acquired date") >= 0
          ? header.indexOf("acquired date")
          : header.indexOf("date") >= 0
            ? header.indexOf("date")
            : -1;
    const estimatedValueIdx =
      header.indexOf("estimated_value") >= 0
        ? header.indexOf("estimated_value")
        : header.indexOf("estimated value") >= 0
          ? header.indexOf("estimated value")
          : header.indexOf("value") >= 0
            ? header.indexOf("value")
            : -1;

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      const title = cells[titleIdx]?.trim();
      if (!title) continue;
      const acquiredDateRaw = acquiredDateIdx >= 0 ? cells[acquiredDateIdx]?.trim() : null;
      const acquiredDate =
        acquiredDateRaw && !Number.isNaN(new Date(acquiredDateRaw).getTime())
          ? new Date(acquiredDateRaw)
          : null;
      const valueRaw = estimatedValueIdx >= 0 ? cells[estimatedValueIdx]?.trim() : null;
      const estimatedValue = valueRaw ? parsePrice(valueRaw) : null;
      await db.insert(personalCollectionItems).values({
        userId: user.id,
        title,
        category: categoryIdx >= 0 ? cells[categoryIdx]?.trim() || null : null,
        year: yearIdx >= 0 ? cells[yearIdx]?.trim() || null : null,
        setName: setIdx >= 0 ? cells[setIdx]?.trim() || null : null,
        playerOrSubject: playerIdx >= 0 ? cells[playerIdx]?.trim() || null : null,
        notes: notesIdx >= 0 ? cells[notesIdx]?.trim() || null : null,
        acquiredDate,
        estimatedValue: estimatedValue && parseFloat(estimatedValue) >= 0 ? estimatedValue : null,
      });
      imported++;
    }
    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    return handleApiError(e);
  }
}
