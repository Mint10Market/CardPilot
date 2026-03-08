import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SyncButton } from "./SyncButton";
import { db } from "@/lib/db";
import { cardTransactions, expenses } from "@/lib/db/schema";
import { eq, and, ne, gte, lte, sum } from "drizzle-orm";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const invResult = await db
    .select({ total: sum(cardTransactions.totalCost) })
    .from(cardTransactions)
    .where(
      and(
        eq(cardTransactions.userId, user.id),
        ne(cardTransactions.status, "Sold")
      )
    );
  const inventoryValue = Number(invResult[0]?.total ?? 0);

  const salesResult = await db
    .select({ total: sum(cardTransactions.sellPrice) })
    .from(cardTransactions)
    .where(
      and(
        eq(cardTransactions.userId, user.id),
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
        eq(cardTransactions.userId, user.id),
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
          eq(expenses.userId, user.id),
          eq(expenses.category, cat),
          gte(expenses.expenseDate, start),
          lte(expenses.expenseDate, end)
        )
      );
    expensesYtd += Number(r[0]?.total ?? 0);
  }
  const trueProfitYtd = salesYtd - cogsYtd - expensesYtd;

  return (
    <AppShell title="Dashboard">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <p className="text-[var(--muted)]">
          Connected with eBay. Your sales, inventory, and customers sync here.
        </p>
        <div className="flex items-center gap-3">
          <SyncButton />
          <span className="text-sm text-[var(--muted)]">
            {user.ebayUsername || user.ebayUserId}
          </span>
        </div>
      </div>
      <section className="mb-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Collection ({year})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[var(--muted)]">Inventory value</p>
            <p className="text-lg font-semibold">{fmt(inventoryValue)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">Sales YTD</p>
            <p className="text-lg font-semibold">{fmt(salesYtd)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)]">True profit YTD</p>
            <p className="text-lg font-semibold">{fmt(trueProfitYtd)}</p>
          </div>
          <div>
            <Link
              href="/collection"
              className="text-sm text-[var(--foreground)] underline"
            >
              View Collection →
            </Link>
          </div>
        </div>
      </section>
      <nav className="flex flex-wrap gap-3" aria-label="Dashboard sections">
          <Link
            href="/sales"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Sales & Profit
          </Link>
          <Link
            href="/collection"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Collection
          </Link>
          <Link
            href="/inventory"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Inventory
          </Link>
          <Link
            href="/customers"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Customers
          </Link>
          <Link
            href="/shows"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Card Shows
          </Link>
        </nav>
    </AppShell>
  );
}
