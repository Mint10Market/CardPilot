import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { SummaryView } from "./SummaryView";

export default async function SummaryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Summary & Income">
      <SummaryView />
    </AppShell>
  );
}
