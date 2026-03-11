import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { handleApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { cardShows } from "@/lib/db/schema";
import { gte, lte, and, or, isNull, ilike } from "drizzle-orm";

/** Escape % and _ for safe use in LIKE patterns. */
function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();
  } catch (e) {
    return handleApiError(e);
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const state = request.nextUrl.searchParams.get("state");
  const city = request.nextUrl.searchParams.get("city");

  const conditions = [];
  // Overlap [from, to]: show must have startDate <= to and (endDate >= from or no endDate).
  // When only from: also require startDate >= from so we don't include shows that started before the range.
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate) {
    conditions.push(
      or(isNull(cardShows.endDate), gte(cardShows.endDate, fromDate))
    );
    conditions.push(gte(cardShows.startDate, fromDate));
  }
  if (toDate) conditions.push(lte(cardShows.startDate, toDate));
  if (state)
    conditions.push(ilike(cardShows.state, `%${escapeLike(state)}%`));
  if (city) conditions.push(ilike(cardShows.city, `%${escapeLike(city)}%`));

  const list = conditions.length
    ? await db
        .select()
        .from(cardShows)
        .where(and(...conditions))
        .orderBy(cardShows.startDate)
    : await db.select().from(cardShows).orderBy(cardShows.startDate);

  return NextResponse.json(list);
}
