import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { TradingExpensesList } from "./TradingExpensesList";

export default async function TradingExpensesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Expenses">
      <TradingExpensesList />
    </AppShell>
  );
}
