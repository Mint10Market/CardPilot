import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { TradingSportsView } from "./TradingSportsView";

export default async function TradingSportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Sport breakdowns">
      <TradingSportsView />
    </AppShell>
  );
}
