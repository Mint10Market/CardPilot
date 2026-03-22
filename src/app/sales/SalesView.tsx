"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { computeOrderDeductions, computePeriodTotals } from "@/lib/sales-calc";

type LineItem = { title?: string; quantity?: number; price?: string; sku?: string };
/** eBay raw order: pricingSummary (what buyer paid) and lineItems with lineItemCost */
type EbayRawPayload = {
  pricingSummary?: {
    priceSubtotal?: { value?: string };
    deliveryCost?: { value?: string };
    tax?: { value?: string };
    fee?: { value?: string };
    total?: { value?: string };
  };
  lineItems?: Array<{
    title?: string;
    quantity?: number;
    lineItemCost?: { value?: string };
    discountedLineItemCost?: { value?: string };
    deliveryCost?: {
      shippingCost?: { value?: string };
      handlingCost?: { value?: string };
    };
  }>;
};
type OrderRow = {
  id: string;
  orderDate?: string;
  saleDate?: string;
  totalAmount?: string;
  amount?: string;
  fees?: string | null;
  shippingCost?: string | null;
  buyerUsername?: string | null;
  buyerUserId?: string | null;
  status?: string;
  ebayOrderId?: string | null;
  currency?: string | null;
  lineItems?: LineItem[];
  rawPayload?: EbayRawPayload | null;
};
type ManualRow = {
  id: string;
  saleDate?: string;
  amount?: string;
  notes?: string | null;
  lineItems?: LineItem[];
};
type TableRow =
  | { type: "eBay"; date: string; amount: string; id: string; extra?: string; record: OrderRow }
  | { type: "Manual"; date: string; amount: string; id: string; record: ManualRow };

function fmtMoney(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

function getShippingLabelCost(rawPayload: unknown): number {
  const raw = rawPayload as EbayRawPayload | null | undefined;
  const items = Array.isArray(raw?.lineItems) ? raw!.lineItems : [];
  let sum = 0;
  for (const li of items) {
    const ship = li?.deliveryCost?.shippingCost?.value;
    const v = typeof ship === "string" ? parseFloat(ship) : Number(ship);
    if (Number.isFinite(v)) sum += v;
  }
  return Math.round(sum * 100) / 100;
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
    const raw = o.rawPayload;
    const orderTotalRaw = raw?.pricingSummary?.total?.value ?? "";
    const orderTotal = orderTotalRaw ? parseFloat(orderTotalRaw) : parseFloat(String(o.totalAmount ?? 0));
    const shippingChargedToBuyer = raw?.pricingSummary?.deliveryCost?.value != null ? parseFloat(raw.pricingSummary.deliveryCost.value) : 0;
    const shippingLabelCost = getShippingLabelCost(o.rawPayload);
    const hasLineItems = Array.isArray((o.rawPayload as unknown as { lineItems?: unknown }).lineItems);
    const deduction = computeOrderDeductions({
      orderTotal,
      fees: o.fees,
      shippingCost: hasLineItems ? shippingLabelCost : o.shippingCost,
      useFeeEstimate: true,
      shippingChargedToBuyer,
    });
    const priceSubtotal = raw?.pricingSummary?.priceSubtotal?.value ?? "";
    const deliveryCost = raw?.pricingSummary?.deliveryCost?.value ?? "";
    const tax = raw?.pricingSummary?.tax?.value ?? "";

    // Line items: prefer raw lineItemCost so item price is correct
    const rawLineItems = raw?.lineItems ?? [];
    const hasRawLineItems = rawLineItems.length > 0 && rawLineItems.some((li) => li.lineItemCost?.value ?? li.discountedLineItemCost?.value);
    const lineItemsForTable = hasRawLineItems
      ? rawLineItems.map((li) => {
          const qty = Math.max(1, li.quantity ?? 1);
          const lineTotalVal = li.discountedLineItemCost?.value ?? li.lineItemCost?.value ?? "0";
          const lineTotal = parseFloat(lineTotalVal) || 0;
          const unit = qty > 0 ? lineTotal / qty : 0;
          return { title: li.title, quantity: qty, unit, lineTotal };
        })
      : (o.lineItems ?? []).map((li) => {
          const qty = Number(li.quantity) || 1;
          const unit = Number(li.price) || 0;
          return { title: li.title, quantity: qty, unit, lineTotal: qty * unit };
        });

    const subtotalFromRaw = priceSubtotal ? parseFloat(priceSubtotal) : lineItemsForTable.reduce((s, li) => s + li.lineTotal, 0);

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
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">Revenue (what the buyer paid)</p>
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
                  {lineItemsForTable.map((li, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="py-2 text-[var(--foreground)] truncate max-w-[180px]" title={li.title}>
                        {li.title || "—"}
                      </td>
                      <td className="py-2 text-right">{li.quantity}</td>
                      <td className="py-2 text-right">${fmtMoney(li.unit)}</td>
                      <td className="py-2 text-right">${fmtMoney(li.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Subtotal</span>
                <span>${fmtMoney(subtotalFromRaw)}</span>
              </div>
              {deliveryCost && parseFloat(deliveryCost) !== 0 && (
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Shipping</span>
                  <span>${fmtMoney(deliveryCost)}</span>
                </div>
              )}
              {tax && parseFloat(tax) !== 0 && (
                <div className="flex justify-between text-[var(--muted)]">
                  <span>Sales tax</span>
                  <span>${fmtMoney(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-[var(--foreground)] pt-1">
                <span>Order total</span>
                <span>${fmtMoney(orderTotal)} {o.currency && o.currency !== "USD" ? o.currency : ""}</span>
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-1 text-sm">
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">Deductions</p>
              <div className="flex justify-between text-[var(--muted)]">
                <span>{deduction.feesIsEstimated ? "eBay fees (est.)" : "eBay fees"}</span>
                <span>−${fmtMoney(deduction.fees)}</span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Shipping cost (your expense)</span>
                <span>{deduction.shippingCost > 0 ? `−$${fmtMoney(deduction.shippingCost)}` : "—"}</span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Cost of card</span>
                <span>{deduction.costOfCard > 0 ? `−$${fmtMoney(deduction.costOfCard)}` : "—"}</span>
              </div>
              <div className="flex justify-between font-medium text-[var(--foreground)] pt-1">
                <span>Total deductions</span>
                <span>−${fmtMoney(deduction.totalDeductions)}</span>
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-3 text-sm">
              <div className="flex justify-between font-semibold text-[var(--foreground)]">
                <span>Net</span>
                <span>${fmtMoney(deduction.net)}</span>
              </div>
              <p className="text-xs text-[var(--muted)] pt-2 mt-1">
                Net = Order total − Total deductions. Profit = Net when cost of card is included above.
              </p>
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
    periodTotals?: {
      totalRevenue: number;
      totalFees: number;
      totalShippingCost: number;
      totalCostOfCard: number;
      totalDeductions: number;
      totalNet: number;
    };
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [breakdownRow, setBreakdownRow] = useState<TableRow | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return fetch(`/api/sales?${params}`)
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || body?.error) {
          setData({
            orders: [],
            manualSales: [],
            totalRevenue: 0,
            periodTotals: { totalRevenue: 0, totalFees: 0, totalShippingCost: 0, totalCostOfCard: 0, totalDeductions: 0, totalNet: 0 },
            error: body?.error ?? "Failed to load sales",
          });
          return;
        }
        setData({
          orders: Array.isArray(body.orders) ? body.orders : [],
          manualSales: Array.isArray(body.manualSales) ? body.manualSales : [],
          totalRevenue: typeof body.totalRevenue === "number" ? body.totalRevenue : 0,
          periodTotals: body.periodTotals ?? undefined,
        });
      })
      .catch(() =>
        setData({
          orders: [],
          manualSales: [],
          totalRevenue: 0,
          periodTotals: { totalRevenue: 0, totalFees: 0, totalShippingCost: 0, totalCostOfCard: 0, totalDeductions: 0, totalNet: 0 },
          error: "Network error",
        })
      );
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const manualSales = Array.isArray(data.manualSales) ? data.manualSales : [];
  const periodTotals =
    data.periodTotals ?? computePeriodTotals(orders, manualSales);

  const all: TableRow[] = [
    ...orders.map((o): TableRow => ({
      type: "eBay",
      date: (o.orderDate || "").toString().slice(0, 10),
      amount: String(o.totalAmount ?? 0),
      id: o.id,
      extra: o.buyerUsername ?? o.buyerUserId ?? undefined,
      record: o,
    })),
    ...manualSales.map((m): TableRow => ({
      type: "Manual",
      date: (m.saleDate || "").toString().slice(0, 10),
      amount: String(m.amount ?? 0),
      id: m.id,
      record: m,
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  return (
    <div className="space-y-4">
      {data.error && (
        <p className="text-sm text-[var(--error)] bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius)] px-3 py-2">
          {data.error}. If you recently deployed, run the database migration (e.g. <code className="text-xs">npm run db:migrate</code>).
        </p>
      )}
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
      <Card className="space-y-1">
        <p className="text-lg font-medium text-[var(--foreground)]">
          Total revenue (period): ${periodTotals.totalRevenue.toFixed(2)}
        </p>
        <p className="text-sm text-[var(--muted)]">
          Total eBay fees: −${periodTotals.totalFees.toFixed(2)}
        </p>
        <p className="text-sm text-[var(--muted)]">
          Total shipping cost: −${periodTotals.totalShippingCost.toFixed(2)}
        </p>
        {periodTotals.totalCostOfCard > 0 && (
          <p className="text-sm text-[var(--muted)]">
            Total cost of card: −${periodTotals.totalCostOfCard.toFixed(2)}
          </p>
        )}
        <p className="text-sm font-medium text-[var(--foreground)]">
          Total deductions: −${periodTotals.totalDeductions.toFixed(2)}
        </p>
        <p className="text-lg font-medium text-[var(--foreground)]">
          Net (after deductions): ${periodTotals.totalNet.toFixed(2)}
        </p>
      </Card>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Revenue</th>
              <th className="p-3 font-medium">eBay fees</th>
              <th className="p-3 font-medium">Shipping</th>
              <th className="p-3 font-medium">Deductions</th>
              <th className="p-3 font-medium">Net</th>
              <th className="p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {all.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-[var(--muted)]">No sales in this period.</td>
              </tr>
            ) : (
              all.map((row) => {
                const amountNum = parseFloat(row.amount);
                const shippingLabelCost = getShippingLabelCost(row.record.rawPayload);
                const hasLineItems = Array.isArray(
                  (row.record.rawPayload as unknown as { lineItems?: unknown }).lineItems
                );
                const deduction =
                  row.type === "eBay"
                    ? computeOrderDeductions({
                        orderTotal: amountNum,
                        fees: row.record.fees,
                        shippingCost: hasLineItems ? shippingLabelCost : row.record.shippingCost,
                        useFeeEstimate: true,
                        shippingChargedToBuyer: row.record.rawPayload?.pricingSummary?.deliveryCost?.value != null
                          ? parseFloat(row.record.rawPayload.pricingSummary.deliveryCost.value!)
                          : 0,
                      })
                    : { fees: 0, shippingCost: 0, totalDeductions: 0, net: amountNum };
                return (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className="p-3">{row.date}</td>
                    <td className="p-3">{row.type}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => setBreakdownRow(row)}
                        className="text-left font-medium text-[var(--foreground)] underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded"
                      >
                        ${fmtMoney(row.amount)}
                      </button>
                    </td>
                    <td className="p-3 text-[var(--muted)]">
                      {deduction.fees > 0 ? `−$${fmtMoney(deduction.fees)}` : "—"}
                    </td>
                    <td className="p-3 text-[var(--muted)]">
                      {deduction.shippingCost > 0 ? `−$${fmtMoney(deduction.shippingCost)}` : "—"}
                    </td>
                    <td className="p-3 text-[var(--muted)]">
                      {deduction.totalDeductions > 0 ? `−$${fmtMoney(deduction.totalDeductions)}` : "—"}
                    </td>
                    <td className="p-3 text-[var(--foreground)]">${fmtMoney(deduction.net)}</td>
                    <td className="p-3 text-[var(--muted)]">{"extra" in row ? row.extra ?? "—" : "—"}</td>
                  </tr>
                );
              })
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
