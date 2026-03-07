"use client";

import { useState } from "react";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setMessage(`Synced ${data.count ?? 0} orders.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Sync from eBay"}
      </button>
      {message && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{message}</span>
      )}
    </div>
  );
}
