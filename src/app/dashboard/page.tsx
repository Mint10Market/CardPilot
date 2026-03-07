import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SyncButton } from "./SyncButton";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

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
      <nav className="flex flex-wrap gap-3" aria-label="Dashboard sections">
          <Link
            href="/sales"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Sales & Profit
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
