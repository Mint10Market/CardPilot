"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";

type Expense = {
  id: string;
  expenseName: string;
  category: string;
  expenseDate: string;
  amount: string;
};

export function ExpensesList() {
  const [list, setList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = () =>
    fetch(`/api/collection/expenses${category ? `?category=${encodeURIComponent(category)}` : ""}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .then(() => setLoading(false), () => setLoading(false));

  useEffect(() => {
    setLoading(true);
    load();
  }, [category]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/collection/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenseName: fd.get("expenseName"),
        category: fd.get("category"),
        expenseDate: fd.get("expenseDate"),
        amount: Number(fd.get("amount")),
      }),
    });
    if (res.ok) {
      setShowAdd(false);
      form.reset();
      load();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/collection/expenses/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  if (loading && list.length === 0) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium min-h-[44px] hover:opacity-90"
        >
          {showAdd ? "Cancel" : "Add expense"}
        </button>
        <Link
          href="/collection"
          className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm min-h-[44px] flex items-center"
        >
          Back to Collection
        </Link>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-[var(--radius)] border border-[var(--border)] p-4 bg-[var(--card)] space-y-3 max-w-md">
          <input
            name="expenseName"
            placeholder="Expense name *"
            required
            className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select
            name="category"
            required
            className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="">Category *</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input name="expenseDate" type="date" required className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm" />
          <input name="amount" type="number" step="0.01" required placeholder="Amount" className="w-full rounded border border-[var(--border)] px-3 py-2 text-sm" />
          <button type="submit" className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90">
            Save
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/20">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--muted)]">
                  No expenses. Add one or import from spreadsheet.
                </td>
              </tr>
            ) : (
              list.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)]/50">
                  <td className="p-3">{e.expenseName}</td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.expenseDate?.slice(0, 10)}</td>
                  <td className="p-3">${e.amount}</td>
                  <td className="p-3">
                    <Link href={`/collection/expenses/${e.id}`} className="text-[var(--foreground)] underline mr-2">
                      Edit
                    </Link>
                    <button type="button" onClick={() => handleDelete(e.id)} className="text-[var(--error)] underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
