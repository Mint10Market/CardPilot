"use client";

import { useEffect, useState } from "react";

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
      .finally(() => setLoading(false));

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

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
        >
          {showAdd ? "Cancel" : "Add item"}
        </button>
        <label className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm cursor-pointer">
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        {importMessage && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{importMessage}</span>
        )}
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900 space-y-3 max-w-md">
          <input name="title" placeholder="Title *" required className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <input name="sku" placeholder="SKU" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <div className="flex gap-3">
            <input name="quantity" type="number" min={0} placeholder="Qty" defaultValue={0} className="w-24 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
            <input name="price" type="text" placeholder="Price" defaultValue="0" className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          </div>
          <input name="condition" placeholder="Condition" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <input name="category" placeholder="Category" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <button type="submit" className="rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium">
            Save
          </button>
        </form>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Qty</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-zinc-500">
                  No items. Add manually or import CSV (columns: title, sku, quantity, price, condition, category).
                </td>
              </tr>
            ) : (
              list.map((i) => (
                <tr key={i.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-3 text-zinc-900 dark:text-zinc-100">{i.title}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 font-mono">{i.sku ?? "—"}</td>
                  <td className="p-3">{i.quantity}</td>
                  <td className="p-3">${i.price}</td>
                  <td className="p-3 capitalize">{i.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
