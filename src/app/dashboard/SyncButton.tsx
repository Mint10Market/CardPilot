"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useFeedback } from "@/components/FeedbackContext";

type SyncStatus = {
  lastSyncAt: string | null;
  status: string | null;
  count: number | null;
  error: string | null;
};

type SyncProgressEvent =
  | { type: "start"; daysBack: number }
  | { type: "page"; offset: number; countInPage: number; totalSoFar: number }
  | { type: "order"; orderId: string; totalAmount: string; totalSoFar: number }
  | { type: "done"; count: number }
  | { type: "error"; message: string };

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

function formatAmount(value: string): string {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const MAX_STREAM_ITEMS = 100;

export function SyncButton() {
  const { showToast } = useFeedback();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamEvents, setStreamEvents] = useState<SyncProgressEvent[]>([]);
  const streamEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (streamEvents.length) streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamEvents]);

  async function handleSync() {
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setStreamEvents([]);
    try {
      const res = await fetch("/api/sync/stream", { method: "POST" });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sync failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const chunk of lines) {
          const m = chunk.match(/^data:\s*(.+)$/m);
          if (!m) continue;
          try {
            const event = JSON.parse(m[1]) as SyncProgressEvent;
            setStreamEvents((prev) => [...prev.slice(-(MAX_STREAM_ITEMS - 1)), event]);
            if (event.type === "error") throw new Error(event.message);
            if (event.type === "done") {
              const msg = `Synced ${event.count} orders.`;
              setSuccessMessage(msg);
              showToast(msg, "success");
              await fetchStatus();
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Sync failed") {
              setErrorMessage(parseErr.message);
              showToast(parseErr.message, "error");
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      setErrorMessage(msg);
      showToast(msg, "error");
      await fetchStatus();
    } finally {
      setLoading(false);
    }
  }

  const showRetry = Boolean(errorMessage);
  const lastDone = streamEvents.filter((e) => e.type === "done").pop();
  const lastOrder = streamEvents.filter((e) => e.type === "order").pop();
  const totalSoFar =
    lastDone?.type === "done" ? lastDone.count : lastOrder?.type === "order" ? lastOrder.totalSoFar : 0;

  return (
    <div className="flex flex-col gap-3 w-full max-w-2xl">
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
          {status && !loading && (
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

      {loading && streamEvents.length > 0 && (
        <section
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
          aria-label="Sync progress"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[var(--muted)]">
              Sync progress
            </h3>
            {totalSoFar > 0 && (
              <span className="text-sm text-[var(--muted)]">
                {totalSoFar} order{totalSoFar !== 1 ? "s" : ""} synced…
              </span>
            )}
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1 font-mono text-xs text-[var(--foreground)]">
            {streamEvents.map((ev, i) => {
              if (ev.type === "start") {
                return (
                  <div key={i} className="text-[var(--muted)]">
                    Fetching last {ev.daysBack} days…
                  </div>
                );
              }
              if (ev.type === "page" && ev.countInPage > 0) {
                return (
                  <div key={i} className="text-[var(--muted)]">
                    Page {Math.floor(ev.offset / 50) + 1}: {ev.countInPage} orders ({ev.totalSoFar} total)
                  </div>
                );
              }
              if (ev.type === "order") {
                return (
                  <div key={i} className="truncate">
                    Order {ev.orderId} — {formatAmount(ev.totalAmount)}
                  </div>
                );
              }
              if (ev.type === "done") {
                return (
                  <div key={i} className="text-[var(--success)] font-medium pt-1">
                    Done. Synced {ev.count} orders.
                  </div>
                );
              }
              if (ev.type === "error") {
                return (
                  <div key={i} className="text-[var(--error)]">
                    Error: {ev.message}
                  </div>
                );
              }
              return null;
            })}
            <div ref={streamEndRef} />
          </div>
        </section>
      )}
    </div>
  );
}
