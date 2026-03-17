import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import { CollectionList } from "./CollectionList";

export default async function CollectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return (
    <AppShell title="Collection">
      <p className="text-[var(--muted)] mb-6 -mt-2">
        Cards and collectibles you keep for personal enjoyment — not for sale. This is separate from Inventory.
      </p>
      <CollectionList />
    </AppShell>
  );
}
