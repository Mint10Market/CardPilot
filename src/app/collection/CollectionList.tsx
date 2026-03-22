"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { useFeedback } from "@/components/FeedbackContext";

type Item = {
  id: string;
  title: string;
  category: string | null;
  year: string | null;
  setName: string | null;
  playerOrSubject: string | null;
  notes: string | null;
  acquiredDate: string | null;
  estimatedValue: string | null;
};

export function CollectionList() {
  const { showToast } = useFeedback();
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"title" | "acquiredDate" | "estimatedValue">("title");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    params.set("sort", sort);
    params.set("order", order);
    return fetch(`/api/collection/items?${params.toString()}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]));
  }, [search, category, sort, order]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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
    const res = await fetch("/api/collection/items/import", { method: "POST", body: formData });
    const data = await res.json();
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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from your collection?`)) return;
    const res = await fetch(`/api/collection/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Item removed.", "success");
      load();
    } else {
      const data = await res.json();
      showToast(data.error || "Delete failed", "error");
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString();
  };

  const formatValue = (v: string | null) => {
    if (v == null || v === "") return "—";
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return "—";
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
        <LinkButton href="/collection/items/new" variant="primary">
          Add item
        </LinkButton>
        <label className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-3 py-2 text-sm cursor-pointer hover:border-[var(--muted)] min-h-[var(--touch-target-min)] inline-flex items-center">
          Import CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
        </label>
        {importMessage && (
          <span className="text-sm text-[var(--muted)]">{importMessage}</span>
        )}
        <button
          type="button"
          onClick={() => {
            const csv = "title,category,year,set,player,notes,acquired_date,estimated_value\nExample card,Baseball,2024,Topps Chrome,,,2024-01-15,5.00";
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "collection-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Download CSV template
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          placeholder="Search title, player, set, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] max-w-xs"
        />
        <input
          type="text"
          placeholder="Category filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] w-32"
        />
        <select
          value={`${sort}-${order}`}
          onChange={(e) => {
            const [s, o] = e.target.value.split("-") as [string, string];
            setSort(s as "title" | "acquiredDate" | "estimatedValue");
            setOrder(o as "asc" | "desc");
          }}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="title-asc">Title A–Z</option>
          <option value="title-desc">Title Z–A</option>
          <option value="acquiredDate-desc">Newest first</option>
          <option value="acquiredDate-asc">Oldest first</option>
          <option value="estimatedValue-desc">Value high–low</option>
          <option value="estimatedValue-asc">Value low–high</option>
        </select>
      </div>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="p-3 font-medium text-[var(--foreground)]">Title</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Category</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Year / Set</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Player / Subject</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Acquired</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Est. value</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-[var(--muted)]">
                  No items in your collection yet. Add items or import from CSV (columns: title, category, year, set, player, notes, acquired_date, estimated_value).
                </td>
              </tr>
            ) : (
              list.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--table-header)]">
                  <td className="p-3 text-[var(--foreground)]">{item.title}</td>
                  <td className="p-3 text-[var(--muted)]">{item.category ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">
                    {[item.year, item.setName].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="p-3 text-[var(--muted)]">{item.playerOrSubject ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{formatDate(item.acquiredDate)}</td>
                  <td className="p-3 text-[var(--muted)]">{formatValue(item.estimatedValue)}</td>
                  <td className="p-3">
                    <Link
                      href={`/collection/items/${item.id}`}
                      className="text-[var(--accent)] hover:underline mr-2"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
