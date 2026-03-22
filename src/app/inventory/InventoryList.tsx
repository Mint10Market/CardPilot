"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";

type Item = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  price: string;
  condition: string | null;
  category: string | null;
  source: string;
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

export function InventoryList() {
  const { showToast } = useFeedback();
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sourceFilter === "ebay" || sourceFilter === "manual") params.set("source", sourceFilter);
    return fetch(`/api/inventory?${params.toString()}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, [search, sourceFilter]);

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

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        sku: data.get("sku") || undefined,
        quantity: Number(data.get("quantity")) || 0,
        price: data.get("price") || "0",
        condition: data.get("condition") || undefined,
        category: data.get("category") || undefined,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      form.reset();
      showToast("Item added.", "success");
      load();
    } else {
      const d = await res.json();
      showToast(d.error || "Add failed", "error");
    }
  };

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
    try {
      const res = await fetch("/api/inventory/sync", { method: "POST" });
      const data = await parseApiJson<{ error?: string; count?: number }>(res, "eBay inventory sync");
      if (!res.ok) throw new Error(data.error || `Sync failed (${res.status})`);
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
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:border-[var(--muted)] min-h-[var(--touch-target-min)]"
        >
          {showAdd ? "Cancel" : "Add item"}
        </button>
        <label className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium cursor-pointer hover:border-[var(--muted)] min-h-[var(--touch-target-min)] inline-flex items-center">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        {importMessage && (
          <span className="text-sm text-[var(--muted)]">{importMessage}</span>
        )}
        {syncError && (
          <span className="text-sm text-[var(--error)]">{syncError}</span>
        )}
      </div>
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
      </div>
      {showAdd && (
        <Card className="max-w-md">
          <form onSubmit={handleAdd} className="space-y-3">
            <input name="title" placeholder="Title *" required className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <input name="sku" placeholder="SKU" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <div className="flex gap-3">
              <input name="quantity" type="number" min={0} placeholder="Qty" defaultValue={0} className="w-24 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
              <input name="price" type="text" placeholder="Price *" defaultValue="0" className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            </div>
            <input name="condition" placeholder="Condition" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <input name="category" placeholder="Category" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <button type="submit" className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90">
              Save
            </button>
          </form>
        </Card>
      )}
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="p-3 font-medium text-[var(--foreground)]">Title</th>
              <th className="p-3 font-medium text-[var(--foreground)]">SKU</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Qty</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Price</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Condition</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Category</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Source</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-[var(--muted)]">
                  No items for sale. Sync from eBay, add an item, or import a CSV. Required columns: title, price. Optional: sku, quantity, condition, category.
                </td>
              </tr>
            ) : (
              list.map((i) => (
                <tr key={i.id} className="border-b border-[var(--border)] hover:bg-[var(--table-header)]">
                  <td className="p-3 text-[var(--foreground)]">{i.title}</td>
                  <td className="p-3 text-[var(--muted)] font-mono">{i.sku ?? "—"}</td>
                  <td className="p-3">{i.quantity}</td>
                  <td className="p-3">{formatPrice(i.price)}</td>
                  <td className="p-3 text-[var(--muted)]">{i.condition ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{i.category ?? "—"}</td>
                  <td className="p-3 capitalize text-[var(--muted)]">{i.source}</td>
                  <td className="p-3">
                    {i.source === "manual" ? (
                      <>
                        <Link
                          href={`/inventory/${i.id}`}
                          className="text-[var(--accent)] hover:underline mr-2"
                        >
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
                    ) : (
                      <span className="text-[var(--muted)]">Edit on eBay</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
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
