"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      .finally(() => setLoading(false));
  }, [from, to, state]);

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          placeholder="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm w-24"
        />
      </div>
      <div className="grid gap-3">
        {list.length === 0 ? (
          <p className="text-zinc-500 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
            No shows in this range. Try refreshing the show list (POST /api/shows/refresh) to load seed data.
          </p>
        ) : (
          list.map((s) => (
            <Link
              key={s.id}
              href={`/shows/${s.id}`}
              className="block rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{s.name}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
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
                          ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          : s.hotColdRating === "warm"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {s.hotColdRating}
                    </span>
                  )}
                  {s.vendorCount != null && (
                    <span className="text-sm text-zinc-500">{s.vendorCount} vendors</span>
                  )}
                  {s.credibilityScore != null && s.credibilityScore > 0 && (
                    <span className="text-xs text-zinc-400">{s.credibilityScore} sources</span>
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
