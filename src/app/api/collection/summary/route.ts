import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { cardTransactions, expenses } from "@/lib/db/schema";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";
import { handleApiError } from "@/lib/api-response";

function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function getYearBounds(year: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const rolling = searchParams.get("rolling"); // e.g. "3" for last 3 months

    type Period = { start: Date; end: Date; label: string };
    const periods: Period[] = [];

    if (rolling) {
      const n = Math.min(12, Math.max(1, parseInt(rolling, 10) || 3));
      const end = new Date();
      const start = new Date(end);
      start.setMonth(start.getMonth() - n);
      periods.push({ start, end, label: `Last ${n} months` });
    } else if (yearParam && monthParam) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);
      if (Number.isFinite(year) && Number.isFinite(month)) {
        const { start, end } = getMonthBounds(year, month);
        periods.push({ start, end, label: `${year}-${String(month).padStart(2, "0")}` });
      }
    } else if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (Number.isFinite(year)) {
        const { start, end } = getYearBounds(year);
        periods.push({ start, end, label: String(year) });
      }
    }

    if (periods.length === 0) {
      // Default: current year
      const y = new Date().getFullYear();
      const { start, end } = getYearBounds(y);
      periods.push({ start, end, label: String(y) });
    }

    const result: Array<{
      period: string;
      sales: number;
      cogs: number;
      grossProfit: number;
      sellingFees: number;
      expensesByCategory: Record<string, number>;
      totalExpenses: number;
      trueProfit: number;
    }> = [];

    for (const { start, end, label } of periods) {
      const userId = user.id;

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
      const sales = Number(salesResult[0]?.total ?? 0);

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
      const cogs = Number(cogsResult[0]?.total ?? 0);

      const feesResult = await db
        .select({ total: sum(cardTransactions.sellingFees) })
        .from(cardTransactions)
        .where(
          and(
            eq(cardTransactions.userId, userId),
            eq(cardTransactions.status, "Sold"),
            gte(cardTransactions.soldDate, start),
            lte(cardTransactions.soldDate, end)
          )
        );
      const sellingFees = Number(feesResult[0]?.total ?? 0);

      const expensesByCategory: Record<string, number> = {};
      let totalExpenses = 0;
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
        const val = Number(r[0]?.total ?? 0);
        expensesByCategory[cat] = val;
        totalExpenses += val;
      }

      result.push({
        period: label,
        sales,
        cogs,
        grossProfit: sales - cogs,
        sellingFees,
        expensesByCategory,
        totalExpenses,
        trueProfit: sales - cogs - totalExpenses,
      });
    }

    return NextResponse.json(
      periods.length === 1 ? result[0] : { periods: result }
    );
  } catch (e) {
    return handleApiError(e);
  }
}
