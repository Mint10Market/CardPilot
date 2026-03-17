import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { TradingTransactionsList } from "./TradingTransactionsList";

export default async function TradingTransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Card Transactions">
      <TradingTransactionsList />
    </AppShell>
  );
}
