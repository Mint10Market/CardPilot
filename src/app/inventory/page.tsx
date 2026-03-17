import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { InventoryList } from "./InventoryList";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Inventory">
      <p className="text-[var(--muted)] mb-6 -mt-2">
        Items for sale — from eBay sync, Add item, or CSV import. Separate from your personal Collection.
      </p>
      <InventoryList />
    </AppShell>
  );
}
