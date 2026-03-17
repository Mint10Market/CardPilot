"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Transaction = {
  id: string;
  sport: string | null;
  playerCharacter: string | null;
  setName: string | null;
  year: string | null;
  status: string | null;
  totalCost: string | null;
  sellPrice: string | null;
  profitDollars: string | null;
  purcDate: string | null;
  soldDate: string | null;
};

export function TradingTransactionsList() {
  const [data, setData] = useState<{ items: Transaction[]; total: number; limit: number; offset: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const limit = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
    if (sport) params.set("sport", sport);
    if (status) params.set("status", status);
    return fetch(`/api/collection/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => (d.items ? setData({ items: d.items, total: d.total, limit: d.limit, offset: d.offset }) : setData(null)))
      .catch(() => setData(null));
  }, [page, sport, status]);

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

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/collection/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purcDate: fd.get("purcDate") || null,
        purcSource: fd.get("purcSource") || null,
        shippingCost: fd.get("shippingCost") || 0,
        qty: fd.get("qty") || null,
        year: fd.get("year") || null,
        setName: fd.get("setName") || null,
        playerCharacter: fd.get("playerCharacter") || null,
        sport: fd.get("sport") || null,
        team: fd.get("team") || null,
        cardPurcPrice: fd.get("cardPurcPrice") || null,
        soldDate: fd.get("soldDate") || null,
        sellPrice: fd.get("sellPrice") || null,
        soldSource: fd.get("soldSource") || null,
        stateSold: fd.get("stateSold") || null,
        feeType: fd.get("feeType") || null,
        notes: fd.get("notes") || null,
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      form.reset();
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/collection/transactions/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  if (loading && !data) return <p className="text-[var(--muted)]">Loading…</p>;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Sport"
          value={sport}
          onChange={(e) => { setSport(e.target.value); setPage(0); }}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm w-32"
        />
        <input
          type="text"
          placeholder="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm w-32"
        />
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium min-h-[var(--touch-target-min)] hover:opacity-90"
        >
          {showAdd ? "Cancel" : "Add transaction"}
        </button>
        <Link
          href="/trading"
          className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm min-h-[44px] flex items-center"
        >
          Back to Trading
        </Link>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-[var(--radius)] border border-[var(--border)] p-4 bg-[var(--card)] space-y-3 max-w-2xl">
          <p className="text-xs text-[var(--muted)] font-medium">Essential</p>
          <div className="grid grid-cols-2 gap-3">
            <input name="purcDate" type="date" placeholder="Purc. date" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="year" placeholder="Year" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="setName" placeholder="Set" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="playerCharacter" placeholder="Player" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="sport" placeholder="Sport" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="cardPurcPrice" type="number" step="0.01" placeholder="Card price" defaultValue={0} className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="soldDate" type="date" placeholder="Sold date" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="sellPrice" type="number" step="0.01" placeholder="Sell price" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
          </div>
          {!showMoreFields ? (
            <button
              type="button"
              onClick={() => setShowMoreFields(true)}
              className="text-sm text-[var(--muted)] underline"
            >
              More options
            </button>
          ) : (
            <>
              <p className="text-xs text-[var(--muted)] font-medium pt-2">Details</p>
              <div className="grid grid-cols-2 gap-3">
                <input name="purcSource" placeholder="Purc. source" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="shippingCost" type="number" step="0.01" placeholder="Shipping" defaultValue={0} className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="qty" type="number" placeholder="Qty" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="team" placeholder="Team" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="soldSource" placeholder="Sold source" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="stateSold" placeholder="State sold" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
                <input name="feeType" placeholder="Fee type" className="rounded border border-[var(--border)] px-3 py-2 text-sm" />
              </div>
              <input name="notes" placeholder="Notes" className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm" />
            </>
          )}
          <button type="submit" className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium min-h-[var(--touch-target-min)] hover:opacity-90">Save</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/20">
              <th className="p-3 font-medium">Sport</th>
              <th className="p-3 font-medium">Player</th>
              <th className="p-3 font-medium">Set / Year</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Total cost</th>
              <th className="p-3 font-medium">Sell price</th>
              <th className="p-3 font-medium">Profit $</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-4 text-[var(--muted)]">
                  No transactions. Add one or import from spreadsheet.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]/50">
                  <td className="p-3">{t.sport ?? "—"}</td>
                  <td className="p-3">{t.playerCharacter ?? "—"}</td>
                  <td className="p-3">{[t.setName, t.year].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="p-3">{t.status ?? "—"}</td>
                  <td className="p-3">{t.totalCost != null ? `$${t.totalCost}` : "—"}</td>
                  <td className="p-3">{t.sellPrice != null ? `$${t.sellPrice}` : "—"}</td>
                  <td className="p-3">{t.profitDollars != null ? `$${t.profitDollars}` : "—"}</td>
                  <td className="p-3">
                    <Link href={`/trading/transactions/${t.id}`} className="text-[var(--foreground)] underline mr-2">Edit</Link>
                    <button type="button" onClick={() => handleDelete(t.id)} className="text-[var(--error)] underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)]">
            Page {page + 1} of {totalPages} ({total} total)
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
