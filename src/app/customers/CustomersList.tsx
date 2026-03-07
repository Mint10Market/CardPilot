"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Customer = {
  id: string;
  identifier: string;
  displayName: string | null;
  email: string | null;
  source: string;
  notes: string | null;
};

export function CustomersList() {
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    fetch(`/api/customers${q}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [search]);

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by name or identifier"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100"
      />
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Name / ID</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Source</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Email</th>
              <th className="p-3 font-medium text-zinc-900 dark:text-zinc-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-zinc-500">
                  No customers yet. Sync from eBay or add manual customers.
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="p-3 text-zinc-900 dark:text-zinc-100">
                    {c.displayName || c.identifier}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400 capitalize">{c.source}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">{c.email ?? "—"}</td>
                  <td className="p-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-zinc-700 dark:text-zinc-300 hover:underline"
                    >
                      View
                    </Link>
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
