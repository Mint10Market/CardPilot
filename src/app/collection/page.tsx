import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { CollectionImportForm } from "./CollectionImportForm";

export default async function CollectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Collection">
      <p className="text-[var(--muted)] mb-6 -mt-2">
        Your personal collection — track and value the cards you keep.
      </p>
      <div className="space-y-8">
        <Card>
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
            Import your collection
          </h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Add cards from a spreadsheet.
          </p>
          <CollectionImportForm />
        </Card>
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Collection
          </p>
          <nav className="flex flex-wrap gap-3" aria-label="Collection sections">
            <LinkButton href="/collection/transactions" variant="secondary">
              Card Transactions
            </LinkButton>
            <LinkButton href="/collection/summary" variant="secondary">
              Summary &amp; Income
            </LinkButton>
            <LinkButton href="/collection/sports" variant="secondary">
              Sport breakdowns
            </LinkButton>
          </nav>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Settings &amp; expenses
          </p>
          <nav className="flex flex-wrap gap-3" aria-label="Collection settings">
            <LinkButton href="/collection/expenses" variant="secondary">
              Expenses
            </LinkButton>
            <LinkButton href="/collection/settings" variant="secondary">
              Settings
            </LinkButton>
          </nav>
        </div>
      </div>
    </AppShell>
  );
}
