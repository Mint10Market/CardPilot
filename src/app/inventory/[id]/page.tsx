import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getInventoryItem } from "@/lib/inventory";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { InventoryEditForm } from "./InventoryEditForm";

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const item = await getInventoryItem(id, user.id);
  if (!item) notFound();
  if (item.source !== "manual") {
    notFound(); // eBay items are view-only; no edit page
  }

  return (
    <AppShell title="Edit inventory item">
      <p className="text-[var(--muted)] mb-4 -mt-2">
        Update this item in your for-sale inventory. eBay-sourced items must be edited on eBay.
      </p>
      <nav className="mb-4">
        <Link href="/inventory" className="text-[var(--accent)] hover:underline text-sm">
          ← Back to Inventory
        </Link>
      </nav>
      <InventoryEditForm item={item} />
    </AppShell>
  );
}
