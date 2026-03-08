import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CollectionImportForm } from "./CollectionImportForm";

export default async function CollectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Collection">
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
            Import from spreadsheet
          </h2>
          <CollectionImportForm />
        </section>
        <nav className="flex flex-wrap gap-3" aria-label="Collection sections">
          <Link
            href="/collection/transactions"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Card Transactions
          </Link>
          <Link
            href="/collection/expenses"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Expenses
          </Link>
          <Link
            href="/collection/summary"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Summary & Income
          </Link>
          <Link
            href="/collection/sports"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Sport breakdowns
          </Link>
          <Link
            href="/collection/settings"
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] hover:opacity-90 min-h-[44px] flex items-center justify-center"
          >
            Settings
          </Link>
        </nav>
      </div>
    </AppShell>
  );
}
