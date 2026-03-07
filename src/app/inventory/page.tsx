import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { InventoryList } from "./InventoryList";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Inventory">
      <InventoryList />
    </AppShell>
  );
}
