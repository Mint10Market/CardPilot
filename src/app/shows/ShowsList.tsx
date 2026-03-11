"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Show = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  vendorCount: number | null;
  credibilityScore: number | null;
  hotColdRating: string | null;
};

export function ShowsList() {
  const [list, setList] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (state) params.set("state", state);
    fetch(`/api/shows?${params}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .then(() => setLoading(false), () => setLoading(false));
  }, [from, to, state]);

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
      </div>
      <div className="grid gap-3">
        {list.length === 0 ? (
          <p className="text-[var(--muted)] p-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
            No shows in this range. Try refreshing the show list (POST /api/shows/refresh) to load seed data.
          </p>
        ) : (
          list.map((s) => (
            <Link
              key={s.id}
              href={`/shows/${s.id}`}
              className="block rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow"
            >
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
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
