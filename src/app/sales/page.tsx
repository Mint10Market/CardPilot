import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { SalesView } from "./SalesView";

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Sales & Profit">
      <SalesView />
    </AppShell>
  );
}
