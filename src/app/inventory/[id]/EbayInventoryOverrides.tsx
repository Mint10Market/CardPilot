"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";

type Props = {
  itemId: string;
  initialCost: string | null;
  initialExtra: Record<string, unknown> | null;
};

export function EbayInventoryOverrides({ itemId, initialCost, initialExtra }: Props) {
  const router = useRouter();
  const { showToast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [cost, setCost] = useState(initialCost ?? "");
  const [extraJson, setExtraJson] = useState(() =>
    initialExtra && Object.keys(initialExtra).length
      ? JSON.stringify(initialExtra, null, 2)
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let extra: Record<string, unknown> | undefined;
    const trimmed = extraJson.trim();
    if (trimmed) {
      try {
        const p = JSON.parse(trimmed) as unknown;
        if (!p || typeof p !== "object" || Array.isArray(p)) {
          showToast("Extra details must be a JSON object.", "error");
          return;
        }
        extra = p as Record<string, unknown>;
      } catch {
        showToast("Invalid JSON in extra details.", "error");
        return;
      }
    } else {
      extra = {};
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costOfCard: cost.trim() === "" ? null : cost.trim(),
          extraDetails: extra,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      showToast("Saved local notes and cost.", "success");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] font-mono text-sm";

  return (
    <Card className="max-w-lg">
      <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">Local overrides</h2>
      <p className="text-xs text-[var(--muted)] mb-4">
        eBay still controls listing title, price, and quantity. You can track cost of goods and custom fields here
        (sync from eBay may reset some fields when listings are re-imported).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ebay-cost" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Cost of card (COG)
          </label>
          <input
            id="ebay-cost"
            type="text"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
            className={inputClass.replace("font-mono", "")}
          />
        </div>
        <div>
          <label htmlFor="ebay-extra" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Extra details (JSON object)
          </label>
          <textarea
            id="ebay-extra"
            rows={6}
            value={extraJson}
            onChange={(e) => setExtraJson(e.target.value)}
            placeholder='{ "notes": "…" }'
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save overrides"}
        </button>
      </form>
    </Card>
  );
}
