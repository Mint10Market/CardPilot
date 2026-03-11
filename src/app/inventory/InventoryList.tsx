"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

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

export function InventoryList() {
  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const load = () =>
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .then(() => setLoading(false), () => setLoading(false));

  useEffect(() => {
    load();
  }, []);

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
      load();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    const res = await fetch("/api/inventory/import", { method: "POST", body: formData });
    const data = await res.json();
    if (res.ok) setImportMessage(`Imported ${data.imported} items.`);
    else setImportMessage(data.error || "Import failed");
    load();
    e.target.value = "";
  };

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          {showAdd ? "Cancel" : "Add item"}
        </button>
        <label className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm cursor-pointer hover:border-[var(--muted)] text-[var(--foreground)]">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        {importMessage && (
          <span className="text-sm text-[var(--muted)]">{importMessage}</span>
        )}
      </div>
      {showAdd && (
        <Card className="max-w-md">
          <form onSubmit={handleAdd} className="space-y-3">
            <input name="title" placeholder="Title *" required className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <input name="sku" placeholder="SKU" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <div className="flex gap-3">
              <input name="quantity" type="number" min={0} placeholder="Qty" defaultValue={0} className="w-24 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
              <input name="price" type="text" placeholder="Price" defaultValue="0" className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
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
              <th className="p-3 font-medium text-[var(--foreground)]">Source</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--muted)]">
                  No items. Add manually or import CSV (columns: title, sku, quantity, price, condition, category).
                </td>
              </tr>
            ) : (
              list.map((i) => (
                <tr key={i.id} className="border-b border-[var(--border)]">
                  <td className="p-3 text-[var(--foreground)]">{i.title}</td>
                  <td className="p-3 text-[var(--muted)] font-mono">{i.sku ?? "—"}</td>
                  <td className="p-3">{i.quantity}</td>
                  <td className="p-3">${i.price}</td>
                  <td className="p-3 capitalize">{i.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
