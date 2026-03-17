"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";

type Item = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  price: string;
  condition: string | null;
  category: string | null;
  source: string;
};

export function InventoryEditForm({ item }: { item: Item }) {
  const router = useRouter();
  const { showToast } = useFeedback();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          sku: data.get("sku") || undefined,
          quantity: Number(data.get("quantity")) || 0,
          price: data.get("price") || "0",
          condition: data.get("condition") || undefined,
          category: data.get("category") || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Update failed");
      }
      showToast("Item updated.", "success");
      router.push("/inventory");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]";

  return (
    <Card className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Title *
          </label>
          <input
            id="title"
            name="title"
            defaultValue={item.title}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            SKU
          </label>
          <input id="sku" name="sku" defaultValue={item.sku ?? ""} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Quantity
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              defaultValue={item.quantity}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Price *
            </label>
            <input
              id="price"
              name="price"
              type="text"
              inputMode="decimal"
              defaultValue={item.price}
              required
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Condition
          </label>
          <input
            id="condition"
            name="condition"
            defaultValue={item.condition ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Category
          </label>
          <input
            id="category"
            name="category"
            defaultValue={item.category ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/inventory")}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:border-[var(--muted)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
