import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
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
  const isEmpty = inventoryValue === 0 && salesYtd === 0 && trueProfitYtd === 0;

  return (
    <AppShell title="Dashboard">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {user.ebayUserId ? (
            <>
              <span
                className="inline-flex items-center gap-2 rounded-full border border-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 text-sm font-medium text-[var(--success)]"
                aria-label="eBay connection status"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden />
                Connected with eBay
              </span>
              <SyncButton />
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--muted)] bg-[var(--muted)]/10 px-3 py-1.5 text-sm font-medium text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--muted)]" aria-hidden />
              eBay not connected
            </span>
          )}
          <Link
            href="/settings"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Settings
          </Link>
        </div>
        <span className="text-sm text-[var(--muted)]">
          {user.displayName || user.ebayUsername || user.ebayUserId || "Account"}
        </span>
      </div>

      {!user.ebayUserId && (
        <Card className="mb-6 p-6">
          <p className="text-[var(--foreground)] mb-3">
            Connect eBay in Settings to sync sales and inventory, or get started by importing your collection.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/settings" variant="primary">
              Connect eBay
            </LinkButton>
            <LinkButton href="/collection" variant="secondary">
              Import collection
            </LinkButton>
          </div>
        </Card>
      )}

      {user.ebayUserId && isEmpty && (
        <Card className="mb-6 p-6">
          <p className="text-[var(--foreground)] mb-3">
            Get started by syncing your eBay sales or importing your collection.
          </p>
          <p className="text-sm text-[var(--muted)] mb-3">
            Use &quot;Sync from eBay&quot; above, or add your collection from a spreadsheet.
          </p>
          <LinkButton href="/collection" variant="secondary">
            Import collection
          </LinkButton>
        </Card>
      )}

      <Card className="mb-6">
        <h2 className="text-sm font-medium text-[var(--muted)] uppercase tracking-wider mb-4">
          Collection ({year})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Inventory value</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{fmt(inventoryValue)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Sales YTD</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{fmt(salesYtd)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider">True profit YTD</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{fmt(trueProfitYtd)}</p>
          </div>
        </div>
        <footer className="mt-4 pt-4 border-t border-[var(--border)] flex justify-end">
          <Link
            href="/collection"
            className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--muted)] transition-colors"
          >
            View Collection →
          </Link>
        </footer>
      </Card>
    </AppShell>
  );
}
