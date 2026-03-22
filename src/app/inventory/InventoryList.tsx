"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";
import { AddItemWizard } from "./AddItemWizard";
import { ebayListingManageUrl } from "@/lib/ebay-listing-url";
import { inventoryStockBadge } from "@/lib/inventory-stock-badge";

type Item = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  price: string;
  costOfCard: string | null;
  primaryImageUrl: string | null;
  condition: string | null;
  category: string | null;
  source: string;
  ebayListingId: string | null;
  listingStatus: string | null;
  itemKind: string | null;
  sportOrTcg: string | null;
};

/**
 * Read JSON from a fetch Response without throwing on HTML/plain-text bodies
 * (Vercel/host timeouts and proxies often return "An error occurred..." instead of JSON).
 */
async function parseApiJson<T extends Record<string, unknown>>(
  res: Response,
  context: string
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(`${context} failed (${res.status}). Empty response.`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = trimmed.replace(/\s+/g, " ").slice(0, 200);
    const timeoutHint =
      res.status === 504 || res.status === 502 || res.status === 503 || res.status === 408
        ? " Request may have timed out — try again with fewer listings or upgrade hosting limits."
        : "";
    throw new Error(
      `${context} (${res.status}): server returned non-JSON.${timeoutHint} ${preview}`
    );
  }
}

function stockBadge(item: Item) {
  return inventoryStockBadge({
    source: item.source,
    quantity: item.quantity,
    listingStatus: item.listingStatus,
  });
}

export function InventoryList() {
  const { showToast } = useFeedback();
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sourceFilter === "ebay" || sourceFilter === "manual") params.set("source", sourceFilter);
    if (availabilityFilter === "in_stock" || availabilityFilter === "sold_out") {
      params.set("availability", availabilityFilter);
    }
    return fetch(`/api/inventory?${params.toString()}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, [search, sourceFilter, availabilityFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/inventory/import", { method: "POST", body: formData });
    const data = await parseApiJson<{ error?: string; imported?: number }>(res, "CSV import");
    if (res.ok) {
      setImportMessage(`Imported ${data.imported} items.`);
      showToast(`Imported ${data.imported} items.`, "success");
      load();
    } else {
      setImportMessage(data.error || "Import failed");
      showToast(data.error || "Import failed", "error");
    }
    e.target.value = "";
  };

  const handleSyncFromEbay = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncHint(null);
    try {
      const res = await fetch("/api/inventory/sync", { method: "POST" });
      const data = await parseApiJson<{
        error?: string;
        hint?: string;
        count?: number;
      }>(res, "eBay inventory sync");
      if (!res.ok) {
        const err = data.error || `Sync failed (${res.status})`;
        setSyncError(err);
        setSyncHint(typeof data.hint === "string" ? data.hint : null);
        showToast(err, "error");
        return;
      }
      const msg = `Synced ${data.count ?? 0} items from eBay.`;
      showToast(msg, "success");
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setSyncError(msg);
      showToast(msg, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string, title: string, source: string) => {
    if (source !== "manual") {
      showToast("eBay-sourced items cannot be deleted here.", "error");
      return;
    }
    if (!confirm(`Remove "${title}" from inventory?`)) return;
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Item removed.", "success");
      load();
    } else {
      const data = await res.json();
      showToast(data.error || "Delete failed", "error");
    }
  };

  const formatPrice = (p: string) => {
    const n = parseFloat(p);
    if (!Number.isFinite(n)) return p;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={handleSyncFromEbay}
          disabled={syncing}
          className="min-h-[var(--touch-target-min)] rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
          aria-busy={syncing}
        >
          {syncing ? "Syncing…" : "Sync from eBay"}
        </button>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:border-[var(--muted)] min-h-[var(--touch-target-min)]"
        >
          Add item
        </button>
        <label className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium cursor-pointer hover:border-[var(--muted)] min-h-[var(--touch-target-min)] inline-flex items-center">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        <div className="flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 ${viewMode === "grid" ? "bg-[var(--accent)]/15 font-medium" : "bg-[var(--card)]"}`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-2 border-l border-[var(--border)] ${viewMode === "table" ? "bg-[var(--accent)]/15 font-medium" : "bg-[var(--card)]"}`}
          >
            Table
          </button>
        </div>
        {importMessage && <span className="text-sm text-[var(--muted)]">{importMessage}</span>}
        {syncError && (
          <div className="flex flex-col gap-1 text-sm max-w-xl">
            <span className="text-[var(--error)]">{syncError}</span>
            {syncHint && <span className="text-[var(--muted)]">{syncHint}</span>}
          </div>
        )}
      </div>

      {showWizard && (
        <AddItemWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            load();
          }}
        />
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] max-w-xs"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">All sources</option>
          <option value="ebay">eBay</option>
          <option value="manual">Manual</option>
        </select>
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">All availability</option>
          <option value="in_stock">In stock</option>
          <option value="sold_out">Sold out</option>
        </select>
      </div>

      {list.length === 0 ? (
        <Card className="p-6 text-[var(--muted)] text-sm">
          No items for sale. Sync from eBay, use Add item, or import a CSV. Required columns: title, price. Optional:
          sku, quantity, condition, category.
        </Card>
      ) : viewMode === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 list-none p-0 m-0">
          {list.map((i) => {
            const badge = stockBadge(i);
            const editHref = i.ebayListingId ? ebayListingManageUrl(i.ebayListingId) : null;
            return (
              <li key={i.id}>
                <Card className="overflow-hidden p-0 h-full flex flex-col">
                  <Link href={`/inventory/${i.id}`} className="block relative aspect-[4/3] bg-[var(--table-header)]">
                    {i.primaryImageUrl ? (
                      <Image
                        src={i.primaryImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">
                        No image
                      </span>
                    )}
                  </Link>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--muted)]/20 text-[var(--muted)] capitalize">
                        {i.source}
                      </span>
                    </div>
                    <Link
                      href={`/inventory/${i.id}`}
                      className="font-medium text-[var(--foreground)] hover:text-[var(--accent)] line-clamp-2"
                    >
                      {i.title}
                    </Link>
                    <div className="text-sm text-[var(--muted)] flex flex-wrap gap-x-3 gap-y-1">
                      <span>{formatPrice(i.price)}</span>
                      <span>Qty {i.quantity}</span>
                      {i.costOfCard != null && <span>Cost {formatPrice(String(i.costOfCard))}</span>}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
                      {i.source === "ebay" ? (
                        editHref ? (
                          <a
                            href={editHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[var(--accent)] hover:underline"
                          >
                            Edit on eBay
                          </a>
                        ) : (
                          <span className="text-sm text-[var(--muted)]" title="Sync again to pick up listing ID">
                            Edit on eBay
                          </span>
                        )
                      ) : (
                        <>
                          <Link href={`/inventory/${i.id}`} className="text-sm text-[var(--accent)] hover:underline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(i.id, i.title, i.source)}
                            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
                  <th className="p-3 font-medium text-[var(--foreground)]">Title</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">SKU</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Qty</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Price</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Cost</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Status</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Source</th>
                  <th className="p-3 font-medium text-[var(--foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const badge = stockBadge(i);
                  const editHref = i.ebayListingId ? ebayListingManageUrl(i.ebayListingId) : null;
                  return (
                    <tr key={i.id} className="border-b border-[var(--border)] hover:bg-[var(--table-header)]">
                      <td className="p-3">
                        <Link href={`/inventory/${i.id}`} className="text-[var(--accent)] hover:underline">
                          {i.title}
                        </Link>
                      </td>
                      <td className="p-3 text-[var(--muted)] font-mono text-xs">{i.sku ?? "—"}</td>
                      <td className="p-3">{i.quantity}</td>
                      <td className="p-3">{formatPrice(i.price)}</td>
                      <td className="p-3 text-[var(--muted)]">
                        {i.costOfCard != null ? formatPrice(String(i.costOfCard)) : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                      </td>
                      <td className="p-3 capitalize text-[var(--muted)]">{i.source}</td>
                      <td className="p-3">
                        {i.source === "manual" ? (
                          <>
                            <Link href={`/inventory/${i.id}`} className="text-[var(--accent)] hover:underline mr-2">
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(i.id, i.title, i.source)}
                              className="text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                              Remove
                            </button>
                          </>
                        ) : editHref ? (
                          <a
                            href={editHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            Edit on eBay
                          </a>
                        ) : (
                          <span className="text-[var(--muted)] text-xs" title="Sync again to pick up listing ID">
                            eBay (no ID)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-[var(--muted)]">
        CSV format: title (required), price (required). Optional columns: sku, quantity, condition, category.{" "}
        <button
          type="button"
          onClick={() => {
            const csv = "title,price,sku,quantity,condition,category\nExample item,9.99,,1,,";
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "inventory-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="text-[var(--accent)] hover:underline"
        >
          Download template
        </button>
      </p>
    </div>
  );
}
