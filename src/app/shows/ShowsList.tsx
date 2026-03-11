"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Show = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  buyerEntryCost: string | null;
  vendorBoothCost: string | null;
  organizerEmail: string | null;
  organizerPhone: string | null;
  vendorCount: number | null;
  credibilityScore: number | null;
  hotColdRating: string | null;
};

function fetchShows(params: URLSearchParams): Promise<Show[]> {
  return fetch(`/api/shows?${params}`).then((r) => r.json());
}

export function ShowsList() {
  const [list, setList] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState("");

  const loadList = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (state) params.set("state", state);
    return fetchShows(params).then(setList).catch(() => setList([]));
  }, [from, to, state]);

  useEffect(() => {
    loadList().finally(() => setLoading(false));
  }, [loadList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/shows/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshMessage({ type: "error", text: data.error || "Refresh failed. Try again." });
        return;
      }
      setRefreshMessage({ type: "success", text: `Loaded ${data.count ?? 0} shows.` });
      await loadList();
    } catch {
      setRefreshMessage({ type: "error", text: "Refresh failed. Try again." });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          placeholder="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--foreground)]"
        />
        <input
          type="date"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm text-[var(--foreground)]"
        />
        <input
          type="text"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-2 py-1.5 text-sm w-24 text-[var(--foreground)]"
        />
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--table-header)] disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh show list"}
        </button>
      </div>
      {refreshMessage && (
        <p
          className={`text-sm ${refreshMessage.type === "success" ? "text-[var(--success)]" : "text-[var(--error)]"}`}
        >
          {refreshMessage.text}
        </p>
      )}
      <div className="grid gap-3">
        {list.length === 0 ? (
          <div className="p-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] space-y-2">
            <p className="text-[var(--muted)]">
              No shows yet. Click &quot;Refresh show list&quot; to load sample shows.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--table-header)] disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh show list"}
            </button>
          </div>
        ) : (
          list.map((s) => (
            <div
              key={s.id}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow"
            >
              <Link href={`/shows/${s.id}`} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium text-[var(--foreground)]">{s.name}</h2>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {new Date(s.startDate).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {s.venue && ` · ${s.venue}`}
                      {s.city && s.state && ` · ${s.city}, ${s.state}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.hotColdRating && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          s.hotColdRating === "hot"
                            ? "bg-[var(--error)]/15 text-[var(--error)]"
                            : s.hotColdRating === "warm"
                              ? "bg-[var(--warning)]/15 text-[var(--warning)]"
                              : "bg-[var(--table-header)] text-[var(--muted)]"
                        }`}
                      >
                        {s.hotColdRating}
                      </span>
                    )}
                    {s.vendorCount != null && (
                      <span className="text-sm text-[var(--muted)]">{s.vendorCount} vendors</span>
                    )}
                    {s.credibilityScore != null && s.credibilityScore > 0 && (
                      <span className="text-xs text-[var(--muted)]">{s.credibilityScore} sources</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">
                  Buyer: {s.buyerEntryCost ?? "—"} · Vendor: {s.vendorBoothCost ?? "—"}
                </p>
              </Link>
              <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                <Link
                  href={`/shows/${s.id}`}
                  className="text-sm text-[var(--info)] hover:underline"
                >
                  Book booth →
                </Link>
                {s.organizerEmail && (
                  <a
                    href={`mailto:${s.organizerEmail}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-[var(--info)] hover:underline"
                  >
                    Email
                  </a>
                )}
                {s.organizerPhone && (
                  <a
                    href={`tel:${s.organizerPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-[var(--info)] hover:underline"
                  >
                    Call
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
