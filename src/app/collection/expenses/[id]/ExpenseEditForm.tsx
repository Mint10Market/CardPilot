"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/collection-calc";

type Expense = {
  id: string;
  expenseName: string;
  category: string;
  expenseDate: string;
  amount: string;
};

export function ExpenseEditForm({ expense: e }: { expense: Expense }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError(null);
    setSaving(true);
    const form = ev.currentTarget;
    const fd = new FormData(form);
    const res = await fetch(`/api/collection/expenses/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenseName: fd.get("expenseName"),
        category: fd.get("category"),
        expenseDate: fd.get("expenseDate"),
        amount: Number(fd.get("amount")),
      }),
    });
    if (res.ok) {
      router.push("/collection/expenses");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Save failed");
      setSaving(false);
    }
  };

  const inputClass = "rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm w-full";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Name</label>
        <input name="expenseName" defaultValue={e.expenseName} required className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Category</label>
        <select name="category" defaultValue={e.category} required className={inputClass}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Date</label>
        <input name="expenseDate" type="date" defaultValue={e.expenseDate?.slice(0, 10)} required className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Amount</label>
        <input name="amount" type="number" step="0.01" defaultValue={e.amount} required className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius)] bg-[var(--foreground)] text-[var(--background)] px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
