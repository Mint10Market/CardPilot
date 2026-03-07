"use client";

import { useEffect, useState } from "react";

type SaleRow = {
  id: string;
  orderDate?: string;
  saleDate?: string;
  totalAmount?: string;
  amount?: string;
  buyerUsername?: string | null;
  status?: string;
  lineItems?: unknown[];
};

export function SalesView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{
    orders: SaleRow[];
    manualSales: SaleRow[];
    totalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const saleDate = fd.get("saleDate") as string || new Date().toISOString().slice(0, 10);
    const amount = fd.get("amount") as string || "0";
    const title = fd.get("lineTitle") as string || "In-person sale";
    await fetch("/api/sales/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleDate,
        amount,
        lineItems: [{ title, quantity: 1, price: amount }],
      }),
    });
    setShowManual(false);
    form.reset();
    load();
  };

  const exportUrl = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/sales/export?${params}`;
  };

  if (loading || !data) return <p className="text-zinc-500">Loading…</p>;

  const all: Array<{ type: string; date: string; amount: string; id: string; extra?: string }> = [
    ...data.orders.map((o) => ({
      type: "eBay",
      date: (o.orderDate || "").toString().slice(0, 10),
      amount: String(o.totalAmount ?? 0),
      id: o.id,
      extra: o.buyerUsername ?? undefined,
    })),
    ...data.manualSales.map((m) => ({
      type: "Manual",
      date: (m.saleDate || "").toString().slice(0, 10),
      amount: String(m.amount ?? 0),
      id: m.id,
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1"
          />
        </label>
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
        >
          Add manual sale
        </button>
        <a
          href={exportUrl()}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm"
        >
          Export CSV
        </a>
      </div>
      {showManual && (
        <form onSubmit={handleManualSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900 max-w-md space-y-3">
          <input name="saleDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <input name="amount" type="text" placeholder="Amount" required className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <input name="lineTitle" type="text" placeholder="Description" defaultValue="In-person sale" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2" />
          <button type="submit" className="rounded bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium">Save</button>
        </form>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Total revenue (period): ${data.totalRevenue.toFixed(2)}
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {all.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-zinc-500">No sales in this period.</td>
              </tr>
            ) : (
              all.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">${row.amount}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{row.extra ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
