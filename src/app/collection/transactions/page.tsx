import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { TransactionsList } from "./TransactionsList";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Card Transactions">
      <TransactionsList />
    </AppShell>
  );
}
