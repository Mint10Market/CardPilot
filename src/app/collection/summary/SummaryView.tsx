"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";

type Summary = {
  period: string;
  sales: number;
  cogs: number;
  grossProfit: number;
  sellingFees: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  trueProfit: number;
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function SummaryView() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"year" | "rolling">("year");

  useEffect(() => {
    setLoading(true);
    const params = view === "rolling" ? "?rolling=3" : `?year=${year}`;
    fetch(`/api/collection/summary${params}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null))
      .then(() => setLoading(false), () => setLoading(false));
  }, [year, view]);

  if (loading && !summary) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        {view === "year" ? (
          <>
            <label className="text-sm text-[var(--muted)]">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            >
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <button
          type="button"
          onClick={() => setView(view === "year" ? "rolling" : "year")}
          className="rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 text-sm"
        >
          {view === "year" ? "Show rolling 3 months" : "Show by year"}
        </button>
        <Link
          href="/collection"
          className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm"
        >
          Back to Collection
        </Link>
      </div>

      {summary ? (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">Period</td>
                <td className="p-3">{summary.period}</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">Sales</td>
                <td className="p-3">{fmt(summary.sales)}</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">COGS</td>
                <td className="p-3">{fmt(summary.cogs)}</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">Gross profit</td>
                <td className="p-3">{fmt(summary.grossProfit)}</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">Selling fees</td>
                <td className="p-3">{fmt(summary.sellingFees)}</td>
              </tr>
              {EXPENSE_CATEGORIES.map((cat) => {
                const val = summary.expensesByCategory[cat] ?? 0;
                if (val === 0) return null;
                return (
                  <tr key={cat} className="border-b border-[var(--border)]">
                    <td className="p-3 pl-6 text-[var(--muted)]">{cat}</td>
                    <td className="p-3">{fmt(val)}</td>
                  </tr>
                );
              })}
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium text-[var(--muted)]">Total expenses</td>
                <td className="p-3">{fmt(summary.totalExpenses)}</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="p-3 font-medium">True profit</td>
                <td className="p-3">{fmt(summary.trueProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[var(--muted)]">No summary data.</p>
      )}
    </div>
  );
}
