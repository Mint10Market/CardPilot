"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SportRow = {
  sport: string;
  invQty: number;
  invValue: number;
  soldQty: number;
  cogs: number;
  soldValue: number;
  profit: number;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function SportsView() {
  const [rows, setRows] = useState<SportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/collection/summary/by-sport")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <Link
        href="/collection"
        className="inline-block text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        ← Back to Collection
      </Link>
      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/20">
              <th className="p-3 font-medium">Sport</th>
              <th className="p-3 font-medium">Inv qty</th>
              <th className="p-3 font-medium">Inv value</th>
              <th className="p-3 font-medium">Sold qty</th>
              <th className="p-3 font-medium">COGS</th>
              <th className="p-3 font-medium">Sold value</th>
              <th className="p-3 font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-[var(--muted)]">
                  No data. Add card transactions or import from spreadsheet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.sport} className="border-b border-[var(--border)]/50">
                  <td className="p-3 font-medium">{r.sport}</td>
                  <td className="p-3">{r.invQty}</td>
                  <td className="p-3">{fmt(r.invValue)}</td>
                  <td className="p-3">{r.soldQty}</td>
                  <td className="p-3">{fmt(r.cogs)}</td>
                  <td className="p-3">{fmt(r.soldValue)}</td>
                  <td className="p-3">{fmt(r.profit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
