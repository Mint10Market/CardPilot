"use client";

import { useState } from "react";

export function CollectionImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    cardTransactions: number;
    expenses: number;
    referenceUpdated: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/collection/import-xlsx", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }
      setResult({
        cardTransactions: data.cardTransactions ?? 0,
        expenses: data.expenses ?? 0,
        referenceUpdated: data.referenceUpdated ?? false,
      });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="xlsx-file" className="block text-sm font-medium text-[var(--foreground)] mb-1">
          Spreadsheet file (.xlsx)
        </label>
        <input
          id="xlsx-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="block w-full text-sm text-[var(--muted)] file:mr-3 file:py-2 file:px-3 file:rounded file:border file:border-[var(--border)] file:bg-[var(--card)] file:text-[var(--foreground)]"
        />
      </div>
      <p className="text-sm text-[var(--muted)]">
        Imports Card Transactions, Expenses, and Sales Tax reference data. This replaces your current collection data.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <p className="text-sm text-[var(--foreground)]">
          Imported {result.cardTransactions} card transactions, {result.expenses} expenses.
          {result.referenceUpdated && " State tax rates updated."}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !file}
        className="rounded-[var(--radius)] bg-[var(--foreground)] text-[var(--background)] px-4 py-2 text-sm font-medium disabled:opacity-50 min-h-[44px]"
      >
        {loading ? "Importing…" : "Import"}
      </button>
    </form>
  );
}
