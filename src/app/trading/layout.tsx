import Link from "next/link";

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-section="trading">
      <nav className="flex flex-wrap gap-2 mb-6" aria-label="Trading sections">
        <Link
          href="/trading"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Trading
        </Link>
        <Link
          href="/trading/transactions"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Card Transactions
        </Link>
        <Link
          href="/trading/summary"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Summary &amp; Income
        </Link>
        <Link
          href="/trading/sports"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Sport breakdowns
        </Link>
        <Link
          href="/trading/expenses"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Expenses
        </Link>
        <Link
          href="/trading/settings"
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm font-medium hover:border-[var(--muted)]"
        >
          Settings
        </Link>
      </nav>
      {children}
    </div>
  );
}
