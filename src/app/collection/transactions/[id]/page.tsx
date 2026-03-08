import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/db";
import { cardTransactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { TransactionEditForm } from "./TransactionEditForm";

export default async function TransactionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const row = await db.query.cardTransactions.findFirst({
    where: and(
      eq(cardTransactions.id, id),
      eq(cardTransactions.userId, user.id)
    ),
  });
  if (!row) notFound();

  const toDateStr = (d: Date | null) => (d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : null);
  const transaction = {
    ...row,
    purcDate: toDateStr(row.purcDate),
    soldDate: toDateStr(row.soldDate),
  };

  return (
    <AppShell title="Edit transaction">
      <div className="space-y-4">
        <Link
          href="/collection/transactions"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Back to Card Transactions
        </Link>
        <TransactionEditForm transaction={transaction} />
      </div>
    </AppShell>
  );
}
