import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { TradingSummaryView } from "./TradingSummaryView";

export default async function TradingSummaryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Summary & Income">
      <TradingSummaryView />
    </AppShell>
  );
}
