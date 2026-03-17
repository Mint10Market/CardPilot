import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { CollectionSettingsForm } from "@/app/collection/settings/CollectionSettingsForm";

export default async function TradingSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Trading settings">
      <div className="space-y-8">
        <section>
          <p className="text-sm text-[var(--muted)] mb-4 max-w-xl">
            These settings drive trading calculations (sales tax, selling fees, sell price goal, and default status for unsold cards).
            Import your spreadsheet to bring in Card Transactions and Expenses; state tax rates from the Sales Tax sheet are stored as reference data.
          </p>
          <CollectionSettingsForm />
        </section>
        <section>
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">Quick links</h2>
          <ul className="list-disc list-inside text-sm text-[var(--muted)] space-y-1">
            <li><Link href="/trading" className="text-[var(--foreground)] underline">Import from spreadsheet</Link></li>
            <li><Link href="/trading/transactions" className="text-[var(--foreground)] underline">Card Transactions</Link></li>
            <li><Link href="/trading/expenses" className="text-[var(--foreground)] underline">Expenses</Link></li>
            <li><Link href="/trading/summary" className="text-[var(--foreground)] underline">Summary & Income</Link></li>
            <li><Link href="/trading/sports" className="text-[var(--foreground)] underline">Sport breakdowns</Link></li>
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
