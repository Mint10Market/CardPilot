import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cardShows } from "@/lib/db/schema";
import { gte, lte, and, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const state = request.nextUrl.searchParams.get("state");
  const city = request.nextUrl.searchParams.get("city");

  const conditions = [];
  if (from) conditions.push(gte(cardShows.startDate, new Date(from)));
  if (to) conditions.push(lte(cardShows.startDate, new Date(to)));
  if (state) conditions.push(ilike(cardShows.state, state));
  if (city) conditions.push(ilike(cardShows.city, `%${city}%`));

  const list = conditions.length
    ? await db
        .select()
        .from(cardShows)
        .where(and(...conditions))
        .orderBy(cardShows.startDate)
    : await db.select().from(cardShows).orderBy(cardShows.startDate);

  return NextResponse.json(list);
}
