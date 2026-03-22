"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";
import {
  SPORTS,
  TCG_GAMES,
  sportCardFields,
  tcgFields,
  collectibleFields,
  buildTitleFromExtra,
} from "@/lib/item-field-config";

type Destination = "inventory" | "collection" | null;
type Kind = "card" | "collectible" | null;
type CardBranch = "sport" | "tcg" | null;

const inputClass =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)] text-sm";

export function AddItemWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useFeedback();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [destination, setDestination] = useState<Destination>(null);
  const [kind, setKind] = useState<Kind>(null);
  const [cardBranch, setCardBranch] = useState<CardBranch>(null);
  const [sportOrTcgValue, setSportOrTcgValue] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("0");
  const [sku, setSku] = useState("");
  const [condition, setCondition] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [extra, setExtra] = useState<Record<string, string>>({});

  const fieldList = useMemo(() => {
    if (kind === "collectible") return collectibleFields;
    if (kind === "card" && cardBranch === "sport") return sportCardFields;
    if (kind === "card" && cardBranch === "tcg") return tcgFields;
    return [];
  }, [kind, cardBranch]);

  const setField = (key: string, value: string) => {
    setExtra((prev) => ({ ...prev, [key]: value }));
  };

  const suggestedTitle = useMemo(() => {
    if (kind === "collectible") return buildTitleFromExtra("collectible", extra);
    if (cardBranch === "sport") return buildTitleFromExtra("sport", extra);
    if (cardBranch === "tcg") return buildTitleFromExtra("tcg", extra);
    return "";
  }, [kind, cardBranch, extra]);

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

  const canNext = () => {
    if (step === 0) return destination != null;
    if (step === 1) return kind != null;
    if (step === 2 && kind === "card") {
      return cardBranch != null && sportOrTcgValue.trim() !== "";
    }
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      if (kind === "collectible") {
        setStep(3);
        return;
      }
      if (kind === "card") {
        setStep(2);
        return;
      }
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };

  const back = () => {
    if (step === 3) {
      setStep(kind === "card" ? 2 : 1);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(0);
      return;
    }
  };

  const buildExtraPayload = (includeNotesInExtra: boolean): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(extra)) {
      if (v.trim()) out[k] = v.trim();
    }
    if (includeNotesInExtra && notes.trim()) out.notes = notes.trim();
    return out;
  };

  const handleSubmit = async () => {
    const finalTitle = title.trim() || suggestedTitle.trim();
    if (!finalTitle) {
      showToast("Add a title or fill fields to generate one.", "error");
      return;
    }
    if (kind === "card" && !sportOrTcgValue.trim()) {
      showToast("Select sport or TCG game.", "error");
      return;
    }
    const sportOrTcg = sportOrTcgValue.trim() || null;
    const itemKind = kind === "card" || kind === "collectible" ? kind : null;

    setSaving(true);
    try {
      if (destination === "inventory") {
        const priceNum = Number(price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          showToast("Invalid price", "error");
          setSaving(false);
          return;
        }
        const extraPayload = buildExtraPayload(true);
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalTitle,
            sku: sku.trim() || undefined,
            quantity: Number(quantity) || 0,
            price: priceNum,
            condition: condition.trim() || undefined,
            category: category.trim() || undefined,
            costOfCard: null,
            primaryImageUrl: imageUrl.trim() || null,
            itemKind,
            sportOrTcg,
            extraDetails: Object.keys(extraPayload).length ? extraPayload : null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to add inventory item");
      } else {
        const extraPayload = buildExtraPayload(false);
        const res = await fetch("/api/collection/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: finalTitle,
            category: category.trim() || null,
            itemKind,
            sportOrTcg,
            extraDetails: Object.keys(extraPayload).length ? extraPayload : null,
            imageUrl: imageUrl.trim() || null,
            notes: notes.trim() || undefined,
            estimatedValue: estimatedValue.trim() || null,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to add collection item");
      }
      showToast("Item added.", "success");
      onSuccess();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const choiceBtn = (active: boolean) =>
    `rounded-[var(--radius)] border px-4 py-3 text-sm font-medium text-left transition-colors min-h-[var(--touch-target-min)] ${
      active
        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]"
        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--muted)]"
    }`;

  return (
    <Card className="max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Add item</h2>
        <button type="button" onClick={onClose} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          Close
        </button>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Where should this item go?</p>
          <button type="button" className={choiceBtn(destination === "inventory")} onClick={() => setDestination("inventory")}>
            For sale (inventory)
          </button>
          <button type="button" className={choiceBtn(destination === "collection")} onClick={() => setDestination("collection")}>
            Personal collection
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">What type of item?</p>
          <button type="button" className={choiceBtn(kind === "card")} onClick={() => setKind("card")}>
            Card
          </button>
          <button type="button" className={choiceBtn(kind === "collectible")} onClick={() => setKind("collectible")}>
            Collectible
          </button>
        </div>
      )}

      {step === 2 && kind === "card" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Sport card or TCG?</p>
          <button type="button" className={choiceBtn(cardBranch === "sport")} onClick={() => setCardBranch("sport")}>
            Sport card
          </button>
          <button type="button" className={choiceBtn(cardBranch === "tcg")} onClick={() => setCardBranch("tcg")}>
            TCG
          </button>
          {cardBranch === "sport" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Sport</label>
              <select
                className={inputClass}
                value={sportOrTcgValue}
                onChange={(e) => setSportOrTcgValue(e.target.value)}
              >
                <option value="">Select…</option>
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          {cardBranch === "tcg" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Game</label>
              <select
                className={inputClass}
                value={sportOrTcgValue}
                onChange={(e) => setSportOrTcgValue(e.target.value)}
              >
                <option value="">Select…</option>
                {TCG_GAMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Title *</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggestedTitle || "Title"} />
            {suggestedTitle && (
              <button
                type="button"
                className="text-xs text-[var(--accent)] mt-1 hover:underline"
                onClick={() => setTitle(suggestedTitle)}
              >
                Use suggested: {suggestedTitle}
              </button>
            )}
          </div>

          {fieldList.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">{f.label}</label>
              <input
                className={inputClass}
                value={extra[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}

          <div>
            <span className="block text-sm font-medium mb-1 text-[var(--foreground)]">Image</span>
            <input className={inputClass} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL or upload" />
            <label className="text-sm text-[var(--accent)] cursor-pointer inline-block mt-1">
              <span className="underline">Upload</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageFile} disabled={uploading} />
              {uploading && <span className="text-[var(--muted)] ml-2">Uploading…</span>}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Notes</label>
            <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {destination === "inventory" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Price *</label>
                  <input className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Qty</label>
                  <input className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">SKU</label>
                <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Condition</label>
                <input className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Category</label>
                <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </>
          )}

          {destination === "collection" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">Estimated value</label>
              <input className={inputClass} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} inputMode="decimal" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-6">
        {step > 0 && (
          <button type="button" onClick={back} className="rounded-[var(--radius)] border border-[var(--border)] px-4 py-2 text-sm">
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canNext()}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save item"}
          </button>
        )}
      </div>
    </Card>
  );
}
