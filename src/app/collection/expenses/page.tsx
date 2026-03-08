import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { ExpensesList } from "./ExpensesList";

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Expenses">
      <ExpensesList />
    </AppShell>
  );
}
