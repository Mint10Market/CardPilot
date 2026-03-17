import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { CollectionItemForm } from "../CollectionItemForm";

export default async function NewCollectionItemPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const initial = {
    title: "",
    category: "",
    year: "",
    setName: "",
    playerOrSubject: "",
    notes: "",
    acquiredDate: "",
    estimatedValue: "",
  };

  return (
    <AppShell title="Add to collection">
      <p className="text-[var(--muted)] mb-4 -mt-2">
        Add a card or collectible you keep for personal enjoyment. This is separate from inventory (items for sale).
      </p>
      <nav className="mb-4">
        <Link href="/collection" className="text-[var(--accent)] hover:underline text-sm">
          ← Back to collection
        </Link>
      </nav>
      <CollectionItemForm itemId={null} initial={initial} />
    </AppShell>
  );
}
