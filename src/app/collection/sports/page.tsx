import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { SportsView } from "./SportsView";

export default async function SportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Sport breakdowns">
      <SportsView />
    </AppShell>
  );
}
