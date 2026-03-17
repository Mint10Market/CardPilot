import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { TradingImportForm } from "./TradingImportForm";

export default async function TradingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Trading">
      <p className="text-[var(--muted)] mb-6 -mt-2">
        Track card transactions, expenses, and profit from buying and selling. Separate from your personal Collection and from Inventory (items for sale).
      </p>
      <div className="space-y-8">
        <Card>
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
            Import from spreadsheet
          </h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Add card transactions and expenses from a spreadsheet (.xlsx).
          </p>
          <TradingImportForm />
        </Card>
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Sections
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/trading/transactions" variant="secondary">
              Card Transactions
            </LinkButton>
            <LinkButton href="/trading/summary" variant="secondary">
              Summary &amp; Income
            </LinkButton>
            <LinkButton href="/trading/sports" variant="secondary">
              Sport breakdowns
            </LinkButton>
            <LinkButton href="/trading/expenses" variant="secondary">
              Expenses
            </LinkButton>
            <LinkButton href="/trading/settings" variant="secondary">
              Settings
            </LinkButton>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
