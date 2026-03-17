import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getCollectionItem } from "@/lib/collection-items";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { CollectionItemForm } from "../CollectionItemForm";

function toDateInputValue(iso: string | Date | null): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditCollectionItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const { id } = await params;
  const item = await getCollectionItem(id, user.id);
  if (!item) notFound();

  const initial = {
    title: item.title,
    category: item.category ?? "",
    year: item.year ?? "",
    setName: item.setName ?? "",
    playerOrSubject: item.playerOrSubject ?? "",
    notes: item.notes ?? "",
    acquiredDate: toDateInputValue(item.acquiredDate),
    estimatedValue: item.estimatedValue ?? "",
  };

  return (
    <AppShell title="Edit collection item">
      <p className="text-[var(--muted)] mb-4 -mt-2">
        Update this item in your personal collection (not for sale).
      </p>
      <nav className="mb-4">
        <Link href="/collection" className="text-[var(--accent)] hover:underline text-sm">
          ← Back to collection
        </Link>
      </nav>
      <CollectionItemForm itemId={item.id} initial={initial} />
    </AppShell>
  );
}
