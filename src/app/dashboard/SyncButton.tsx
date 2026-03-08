"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFeedback } from "@/components/FeedbackContext";

type SyncStatus = {
  lastSyncAt: string | null;
  status: string | null;
  count: number | null;
  error: string | null;
};

function formatLastSync(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = Date.now();
  const ms = now - d.getTime();
  if (ms < 60_000) return "Just now";
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)} hours ago`;
  return `${Math.floor(ms / 86400_000)} days ago`;
}

export function SyncButton() {
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const data = await res.json();
        setStatus({
          lastSyncAt: data.lastSyncAt ?? null,
          status: data.status ?? null,
          count: data.count ?? null,
          error: data.error ?? null,
        });
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleSync() {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      const msg = `Synced ${data.count ?? 0} orders.`;
      setSuccessMessage(msg);
      showToast(msg, "success");
      await fetchStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  const showRetry = Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="min-h-[44px] min-w-[120px] rounded-lg bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          aria-busy={loading}
        >
          {loading ? "Syncing…" : showRetry ? "Try again" : "Sync from eBay"}
        </button>
        {status && (
          <span className="text-sm text-[var(--muted)]">
            Last synced: {formatLastSync(status.lastSyncAt)}
          </span>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-[var(--success)]">
          {successMessage}{" "}
          <Link href="/sales" className="underline">
            View Sales
          </Link>
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-[var(--error)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
