import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth-server";
import { getInventoryItem } from "@/lib/inventory";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { InventoryEditForm } from "./InventoryEditForm";
import { EbayInventoryOverrides } from "./EbayInventoryOverrides";
import { ebayListingManageUrl } from "@/lib/ebay-listing-url";
import { inventoryStockBadge } from "@/lib/inventory-stock-badge";

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

  const qtyBadge =
    item.quantity > 0
      ? { label: "In stock", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" }
      : { label: "Sold out", className: "bg-red-500/15 text-red-800 dark:text-red-300" };
  const listBadge = inventoryStockBadge({
    source: item.source,
    quantity: item.quantity,
    listingStatus: item.listingStatus,
  });
  const editUrl = item.ebayListingId ? ebayListingManageUrl(item.ebayListingId) : null;

  return (
    <AppShell title={item.source === "ebay" ? "Inventory item" : "Edit inventory item"}>
      <nav className="mb-4">
        <Link href="/inventory" className="text-[var(--accent)] hover:underline text-sm">
          ← Back to Inventory
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] items-start mb-6">
        <div className="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden bg-[var(--card)] aspect-[4/5] relative max-w-sm">
          {item.primaryImageUrl ? (
            <Image
              src={item.primaryImageUrl}
              alt=""
              fill
              className="object-contain p-2"
              sizes="280px"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] text-[var(--muted)] text-sm p-4 text-center">
              No image
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">{item.title}</h1>
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-[var(--radius)] capitalize ${item.source === "ebay" ? "bg-blue-500/15 text-blue-800 dark:text-blue-300" : "bg-[var(--muted)]/20 text-[var(--foreground)]"}`}
            >
              {item.source}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-[var(--radius)] ${qtyBadge.className}`}>
              {qtyBadge.label}
            </span>
            {item.source === "ebay" && item.quantity > 0 && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-[var(--radius)] ${listBadge.className}`}
                title={item.listingStatus ?? undefined}
              >
                {listBadge.label}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-[var(--muted)]">SKU</dt>
              <dd className="text-[var(--foreground)] font-mono">{item.sku ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Quantity</dt>
              <dd className="text-[var(--foreground)]">{item.quantity}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Price</dt>
              <dd className="text-[var(--foreground)]">${item.price}</dd>
            </div>
            {item.costOfCard != null && (
              <div>
                <dt className="text-[var(--muted)]">Cost</dt>
                <dd className="text-[var(--foreground)]">${item.costOfCard}</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--muted)]">Condition</dt>
              <dd className="text-[var(--foreground)]">{item.condition ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Category</dt>
              <dd className="text-[var(--foreground)]">{item.category ?? "—"}</dd>
            </div>
            {item.itemKind && (
              <div>
                <dt className="text-[var(--muted)]">Kind</dt>
                <dd className="text-[var(--foreground)] capitalize">{item.itemKind}</dd>
              </div>
            )}
            {item.sportOrTcg && (
              <div>
                <dt className="text-[var(--muted)]">Sport / TCG</dt>
                <dd className="text-[var(--foreground)]">{item.sportOrTcg}</dd>
              </div>
            )}
            {item.ebayOfferId && (
              <div>
                <dt className="text-[var(--muted)]">eBay offer ID</dt>
                <dd className="text-[var(--foreground)] font-mono text-xs break-all">{item.ebayOfferId}</dd>
              </div>
            )}
            {item.ebayListingId && (
              <div>
                <dt className="text-[var(--muted)]">eBay listing ID</dt>
                <dd className="text-[var(--foreground)] font-mono text-xs break-all">{item.ebayListingId}</dd>
              </div>
            )}
          </dl>
          {item.source === "ebay" && (
            <div className="pt-2">
              {editUrl ? (
                <a
                  href={editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90"
                >
                  Edit on eBay
                </a>
              ) : (
                <p className="text-sm text-[var(--muted)]" title="Run Sync from eBay on the inventory list">
                  No listing ID yet — sync from eBay to pick up listing link.
                </p>
              )}
            </div>
          )}
          {item.extraDetails && typeof item.extraDetails === "object" && Object.keys(item.extraDetails).length > 0 && (
            <div className="pt-2">
              <h2 className="text-sm font-medium text-[var(--foreground)] mb-1">Extra details</h2>
              <pre className="text-xs bg-[var(--table-header)] rounded-[var(--radius)] p-3 overflow-x-auto text-[var(--foreground)]">
                {JSON.stringify(item.extraDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {item.source === "ebay" ? (
        <EbayInventoryOverrides
          itemId={item.id}
          initialCost={item.costOfCard}
          initialExtra={(item.extraDetails as Record<string, unknown> | null) ?? null}
        />
      ) : (
        <>
          <p className="text-[var(--muted)] mb-4 text-sm">
            Update this item in your for-sale inventory. eBay-sourced items must be edited on eBay.
          </p>
          <InventoryEditForm item={item} />
        </>
      )}
    </AppShell>
  );
}
