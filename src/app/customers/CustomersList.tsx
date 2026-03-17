"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Customer = {
  id: string;
  identifier: string;
  displayName: string | null;
  email: string | null;
  source: string;
  notes: string | null;
  orderCount?: number;
  totalRevenue?: number;
};

export function CustomersList() {
  const [list, setList] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("stats", "1");
    const q = `?${params.toString()}`;
    fetch(`/api/customers${q}`)
      .then((r) => r.json())
      .then(setList)
      .catch(() => setList([]))
      .then(() => setLoading(false), () => setLoading(false));
  }, [search]);

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by name or identifier"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
      />
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="p-3 font-medium text-[var(--foreground)]">Name / ID</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Source</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Orders</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Total revenue</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Email</th>
              <th className="p-3 font-medium text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-[var(--muted)]">
                  No customers yet. Sync from eBay or add manual customers.
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--table-header)]">
                  <td className="p-3 text-[var(--foreground)]">
                    {c.displayName || c.identifier}
                  </td>
                  <td className="p-3 text-[var(--muted)] capitalize">{c.source}</td>
                  <td className="p-3 text-[var(--muted)]">{c.orderCount ?? "—"}</td>
                  <td className="p-3 text-[var(--muted)]">
                    {c.totalRevenue != null
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(c.totalRevenue)
                      : "—"}
                  </td>
                  <td className="p-3 text-[var(--muted)]">{c.email ?? "—"}</td>
                  <td className="p-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
