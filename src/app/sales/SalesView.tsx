"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type LineItem = { title?: string; quantity?: number; price?: string; sku?: string };
type OrderRow = {
  id: string;
  orderDate?: string;
  saleDate?: string;
  totalAmount?: string;
  amount?: string;
  buyerUsername?: string | null;
  buyerUserId?: string | null;
  status?: string;
  ebayOrderId?: string | null;
  currency?: string | null;
  lineItems?: LineItem[];
};
type ManualRow = {
  id: string;
  saleDate?: string;
  amount?: string;
  notes?: string | null;
  lineItems?: LineItem[];
};
type SaleRow = OrderRow | ManualRow;
type TableRow =
  | { type: "eBay"; date: string; amount: string; id: string; extra?: string; record: OrderRow }
  | { type: "Manual"; date: string; amount: string; id: string; record: ManualRow };

function fmtMoney(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

function TransactionBreakdownModal({
  row,
  onClose,
}: {
  row: TableRow;
  onClose: () => void;
}) {
  if (row.type === "eBay") {
    const o = row.record;
    const lineItems = (o.lineItems ?? []) as LineItem[];
    const subtotal = lineItems.reduce(
      (sum, li) => sum + (Number(li.price) || 0) * (Number(li.quantity) || 1),
      0
    );
    const total = parseFloat(String(o.totalAmount ?? 0));
    const diff = total - subtotal;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Transaction breakdown"
      >
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              eBay order breakdown
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--table-header)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-4 overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-[var(--muted)]">Order ID</span>
                <p className="font-mono text-[var(--foreground)]">{o.ebayOrderId ?? "—"}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Date</span>
                <p className="text-[var(--foreground)]">{row.date}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Buyer</span>
                <p className="text-[var(--foreground)]">{o.buyerUsername ?? o.buyerUserId ?? "—"}</p>
              </div>
              <div>
                <span className="text-[var(--muted)]">Status</span>
                <p className="text-[var(--foreground)]">{o.status ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">Line items</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-right py-2 font-medium">Qty</th>
                    <th className="text-right py-2 font-medium">Unit price</th>
                    <th className="text-right py-2 font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => {
                    const qty = Number(li.quantity) || 1;
                    const unit = Number(li.price) || 0;
                    const lineTotal = qty * unit;
                    return (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="py-2 text-[var(--foreground)] truncate max-w-[180px]" title={li.title}>
                          {li.title || "—"}
                        </td>
                        <td className="py-2 text-right">{qty}</td>
                        <td className="py-2 text-right">${fmtMoney(unit)}</td>
                        <td className="py-2 text-right">${fmtMoney(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Subtotal (items)</span>
                <span>${fmtMoney(subtotal)}</span>
              </div>
              {Math.abs(diff) > 0.005 && (
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Shipping / tax / fees</span>
                  <span>{diff >= 0 ? "+" : ""}${fmtMoney(diff)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[var(--foreground)] pt-1">
                <span>Order total</span>
                <span>${fmtMoney(total)} {o.currency && o.currency !== "USD" ? o.currency : ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const m = row.record;
  const lineItems = (m.lineItems ?? []) as LineItem[];
  const total = parseFloat(String(m.amount ?? 0));
  const calculatedTotal = lineItems.reduce(
    (sum, li) => sum + (Number(li.price) || 0) * (Number(li.quantity) || 1),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Transaction breakdown"
    >
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Manual sale breakdown
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--table-header)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[var(--muted)]">Date</span>
              <p className="text-[var(--foreground)]">{row.date}</p>
            </div>
            {m.notes && (
              <div className="col-span-2">
                <span className="text-[var(--muted)]">Notes</span>
                <p className="text-[var(--foreground)]">{m.notes}</p>
              </div>
            )}
          </div>
          {lineItems.length > 0 ? (
            <>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Line items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit price</th>
                      <th className="text-right py-2 font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((li, i) => {
                      const qty = Number(li.quantity) || 1;
                      const unit = Number(li.price) || 0;
                      const lineTotal = qty * unit;
                      return (
                        <tr key={i} className="border-b border-[var(--border)]">
                          <td className="py-2 text-[var(--foreground)] truncate max-w-[180px]" title={li.title}>
                            {li.title || "—"}
                          </td>
                          <td className="py-2 text-right">{qty}</td>
                          <td className="py-2 text-right">${fmtMoney(unit)}</td>
                          <td className="py-2 text-right">${fmtMoney(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {Math.abs(calculatedTotal - total) > 0.005 && (
                <div className="flex justify-between text-sm text-[var(--muted)]">
                  <span>Calculated from items</span>
                  <span>${fmtMoney(calculatedTotal)}</span>
                </div>
              )}
            </>
          ) : null}
          <div className="border-t border-[var(--border)] pt-3 flex justify-between font-semibold text-[var(--foreground)]">
            <span>Total</span>
            <span>${fmtMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalesView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{
    orders: OrderRow[];
    manualSales: ManualRow[];
    totalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [breakdownRow, setBreakdownRow] = useState<TableRow | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/sales?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .then(() => setLoading(false), () => setLoading(false));
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

  if (loading || !data) return <p className="text-[var(--muted)]">Loading…</p>;

  const all: TableRow[] = [
    ...data.orders.map((o): TableRow => ({
      type: "eBay",
      date: (o.orderDate || "").toString().slice(0, 10),
      amount: String(o.totalAmount ?? 0),
      id: o.id,
      extra: o.buyerUsername ?? o.buyerUserId ?? undefined,
      record: o,
    })),
    ...data.manualSales.map((m): TableRow => ({
      type: "Manual",
      date: (m.saleDate || "").toString().slice(0, 10),
      amount: String(m.amount ?? 0),
      id: m.id,
      record: m,
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm text-[var(--muted)]">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1"
          />
        </label>
        <label className="text-sm text-[var(--muted)]">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowManual(!showManual)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Add manual sale
        </button>
        <a
          href={exportUrl()}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--muted)]"
        >
          Export CSV
        </a>
      </div>
      {showManual && (
        <Card className="max-w-md">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input name="saleDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <input name="amount" type="text" placeholder="Amount" required className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <input name="lineTitle" type="text" placeholder="Description" defaultValue="In-person sale" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]" />
            <button type="submit" className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90">Save</button>
          </form>
        </Card>
      )}
      <Card>
        <p className="text-lg font-medium text-[var(--foreground)]">
          Total revenue (period): ${data.totalRevenue.toFixed(2)}
        </p>
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {all.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-[var(--muted)]">No sales in this period.</td>
              </tr>
            ) : (
              all.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setBreakdownRow(row)}
                      className="text-left font-medium text-[var(--foreground)] underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded"
                    >
                      ${row.amount}
                    </button>
                  </td>
                  <td className="p-3 text-[var(--muted)]">{"extra" in row ? row.extra ?? "—" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      {breakdownRow && (
        <TransactionBreakdownModal
          row={breakdownRow}
          onClose={() => setBreakdownRow(null)}
        />
      )}
    </div>
  );
}
