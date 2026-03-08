import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { cardTransactions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();

    const rows = await db
      .select({
        sport: cardTransactions.sport,
        invQty: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} IS DISTINCT FROM 'Sold' THEN COALESCE(${cardTransactions.qty}, 0) ELSE 0 END), 0)::int`,
        invValue: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} IS DISTINCT FROM 'Sold' THEN (${cardTransactions.totalCost})::numeric ELSE 0 END), 0)::float`,
        soldQty: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} = 'Sold' THEN COALESCE(${cardTransactions.qty}, 0) ELSE 0 END), 0)::int`,
        cogs: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} = 'Sold' THEN (${cardTransactions.totalCost})::numeric ELSE 0 END), 0)::float`,
        soldValue: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} = 'Sold' THEN (${cardTransactions.sellPrice})::numeric ELSE 0 END), 0)::float`,
        profit: sql<number>`COALESCE(SUM(CASE WHEN ${cardTransactions.status} = 'Sold' THEN (${cardTransactions.profitDollars})::numeric ELSE 0 END), 0)::float`,
      })
      .from(cardTransactions)
      .where(eq(cardTransactions.userId, user.id))
      .groupBy(cardTransactions.sport);

    const result = rows.map((r) => ({
      sport: r.sport ?? "Other",
      invQty: Number(r.invQty ?? 0),
      invValue: Number(r.invValue ?? 0),
      soldQty: Number(r.soldQty ?? 0),
      cogs: Number(r.cogs ?? 0),
      soldValue: Number(r.soldValue ?? 0),
      profit: Number(r.profit ?? 0),
    }));

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
