"use client";

import { useEffect, useState } from "react";

type Settings = {
  salesTaxRate: string | null;
  shippingUnder20: string | null;
  shippingOver20: string | null;
  sellingProfitGoal: string | null;
  inStockStatus: string | null;
};

export function CollectionSettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/collection/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setSaving(true);
    try {
      const res = await fetch("/api/collection/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salesTaxRate: fd.get("salesTaxRate") || 0,
          shippingUnder20: fd.get("shippingUnder20") || 0,
          shippingOver20: fd.get("shippingOver20") || 0,
          sellingProfitGoal: fd.get("sellingProfitGoal") || 0.2,
          inStockStatus: fd.get("inStockStatus") || "Available",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  const s = settings ?? {};
  const inputClass = "rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm w-full max-w-xs";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Sales tax rate (decimal, e.g. 0.0725)</label>
        <input name="salesTaxRate" type="number" step="0.0001" defaultValue={s.salesTaxRate ?? "0"} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Shipping charge under $20 ($)</label>
        <input name="shippingUnder20" type="number" step="0.01" defaultValue={s.shippingUnder20 ?? "0"} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Shipping charge $20+ ($)</label>
        <input name="shippingOver20" type="number" step="0.01" defaultValue={s.shippingOver20 ?? "0"} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Selling profit goal (decimal, e.g. 0.20 for 20%)</label>
        <input name="sellingProfitGoal" type="number" step="0.01" defaultValue={s.sellingProfitGoal ?? "0.2"} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">In-stock status label</label>
        <input name="inStockStatus" type="text" defaultValue={s.inStockStatus ?? "Available"} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius)] bg-[var(--foreground)] text-[var(--background)] px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
