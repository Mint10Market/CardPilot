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
  costOfCard: string | null;
  primaryImageUrl: string | null;
  condition: string | null;
  category: string | null;
  itemKind: string | null;
  sportOrTcg: string | null;
  extraDetails: Record<string, unknown> | null;
  source: string;
};

export function InventoryEditForm({ item }: { item: Item }) {
  const router = useRouter();
  const { showToast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(item.primaryImageUrl ?? "");
  const [extraJson, setExtraJson] = useState(() =>
    item.extraDetails && Object.keys(item.extraDetails).length
      ? JSON.stringify(item.extraDetails, null, 2)
      : ""
  );

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/uploads/item-image", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (data.url) setImageUrl(data.url);
      showToast("Image uploaded.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    let extra: Record<string, unknown> | null = null;
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
          costOfCard: (data.get("costOfCard") as string)?.trim() || null,
          primaryImageUrl: imageUrl.trim() || null,
          itemKind: (data.get("itemKind") as string) || null,
          sportOrTcg: (data.get("sportOrTcg") as string)?.trim() || null,
          extraDetails: extra,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
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
          <label htmlFor="costOfCard" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Cost of card (COG)
          </label>
          <input
            id="costOfCard"
            name="costOfCard"
            type="text"
            inputMode="decimal"
            defaultValue={item.costOfCard ?? ""}
            placeholder="0.00"
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="itemKind" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Item kind
            </label>
            <select
              id="itemKind"
              name="itemKind"
              defaultValue={item.itemKind ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="card">Card</option>
              <option value="collectible">Collectible</option>
            </select>
          </div>
          <div>
            <label htmlFor="sportOrTcg" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Sport / TCG label
            </label>
            <input
              id="sportOrTcg"
              name="sportOrTcg"
              defaultValue={item.sportOrTcg ?? ""}
              placeholder="e.g. Baseball, Pokémon"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-[var(--foreground)] mb-1">Image</span>
          <div className="flex flex-col gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (or upload below)"
              className={inputClass}
            />
            <label className="text-sm text-[var(--accent)] cursor-pointer">
              <span className="underline">Upload file</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFile} disabled={uploading} />
              {uploading && <span className="text-[var(--muted)] ml-2">Uploading…</span>}
            </label>
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
        <div>
          <label htmlFor="extraJson" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Extra details (JSON)
          </label>
          <textarea
            id="extraJson"
            rows={4}
            value={extraJson}
            onChange={(e) => setExtraJson(e.target.value)}
            className={`${inputClass} font-mono text-sm`}
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
