import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { cardTransactions, expenses } from "@/lib/db/schema";
import { eq, and, ne, gte, lte, sum } from "drizzle-orm";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();
    const userId = user.id;
    const year = new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const invResult = await db
      .select({ total: sum(cardTransactions.totalCost) })
      .from(cardTransactions)
      .where(
        and(
          eq(cardTransactions.userId, userId),
          ne(cardTransactions.status, "Sold")
        )
      );
    const inventoryValue = Number(invResult[0]?.total ?? 0);

    const salesResult = await db
      .select({ total: sum(cardTransactions.sellPrice) })
      .from(cardTransactions)
      .where(
        and(
          eq(cardTransactions.userId, userId),
          eq(cardTransactions.status, "Sold"),
          gte(cardTransactions.soldDate, start),
          lte(cardTransactions.soldDate, end)
        )
      );
    const salesYtd = Number(salesResult[0]?.total ?? 0);

    const cogsResult = await db
      .select({ total: sum(cardTransactions.totalCost) })
      .from(cardTransactions)
      .where(
        and(
          eq(cardTransactions.userId, userId),
          eq(cardTransactions.status, "Sold"),
          gte(cardTransactions.soldDate, start),
          lte(cardTransactions.soldDate, end)
        )
      );
    const cogsYtd = Number(cogsResult[0]?.total ?? 0);

    let expensesYtd = 0;
    for (const cat of EXPENSE_CATEGORIES) {
      const r = await db
        .select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            eq(expenses.category, cat),
            gte(expenses.expenseDate, start),
            lte(expenses.expenseDate, end)
          )
        );
      expensesYtd += Number(r[0]?.total ?? 0);
    }
    const trueProfitYtd = salesYtd - cogsYtd - expensesYtd;

    return NextResponse.json({
      inventoryValue,
      salesYtd,
      trueProfitYtd,
      year,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
