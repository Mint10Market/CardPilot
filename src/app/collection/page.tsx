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
      <div className="space-y-8">
        <Card>
          <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">
            Import from spreadsheet
          </h2>
          <CollectionImportForm />
        </Card>
        <nav className="flex flex-wrap gap-3" aria-label="Collection sections">
          <LinkButton href="/collection/transactions" variant="secondary">
            Card Transactions
          </LinkButton>
          <LinkButton href="/collection/expenses" variant="secondary">
            Expenses
          </LinkButton>
          <LinkButton href="/collection/summary" variant="secondary">
            Summary & Income
          </LinkButton>
          <LinkButton href="/collection/sports" variant="secondary">
            Sport breakdowns
          </LinkButton>
          <LinkButton href="/collection/settings" variant="secondary">
            Settings
          </LinkButton>
        </nav>
      </div>
    </AppShell>
  );
}
