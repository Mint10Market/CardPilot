import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { ExpenseEditForm } from "./ExpenseEditForm";

export default async function ExpenseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const row = await db.query.expenses.findFirst({
    where: and(eq(expenses.id, id), eq(expenses.userId, user.id)),
  });
  if (!row) notFound();

  const expense = {
    ...row,
    expenseDate: row.expenseDate instanceof Date ? row.expenseDate.toISOString().slice(0, 10) : String(row.expenseDate ?? ""),
    amount: String(row.amount ?? ""),
  };

  return (
    <AppShell title="Edit expense">
      <div className="space-y-4">
        <Link
          href="/collection/expenses"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← Back to Expenses
        </Link>
        <ExpenseEditForm expense={expense} />
      </div>
    </AppShell>
  );
}
