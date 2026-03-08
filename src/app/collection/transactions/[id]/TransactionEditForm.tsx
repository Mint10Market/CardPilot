"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  purcDate: string | null;
  purcSource: string | null;
  shippingCost: string | null;
  qty: number | null;
  year: string | null;
  setName: string | null;
  variation: string | null;
  cardType: string | null;
  playerCharacter: string | null;
  sport: string | null;
  team: string | null;
  cardNotes: string | null;
  attributes: string | null;
  numberedTo: string | null;
  grade: string | null;
  gradingCompany: string | null;
  certNumber: string | null;
  cardPurcPrice: string | null;
  soldDate: string | null;
  sellPrice: string | null;
  soldSource: string | null;
  stateSold: string | null;
  feeType: string | null;
  notes: string | null;
};

function toInputDate(d: string | Date | null): string {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toISOString().slice(0, 10);
}

export function TransactionEditForm({ transaction: t }: { transaction: Transaction }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body: Record<string, unknown> = {
      purcDate: fd.get("purcDate") || null,
      purcSource: fd.get("purcSource") || null,
      shippingCost: fd.get("shippingCost") ?? 0,
      qty: fd.get("qty") ? Number(fd.get("qty")) : null,
      year: fd.get("year") || null,
      setName: fd.get("setName") || null,
      variation: fd.get("variation") || null,
      cardType: fd.get("cardType") || null,
      playerCharacter: fd.get("playerCharacter") || null,
      sport: fd.get("sport") || null,
      team: fd.get("team") || null,
      cardNotes: fd.get("cardNotes") || null,
      attributes: fd.get("attributes") || null,
      numberedTo: fd.get("numberedTo") || null,
      grade: fd.get("grade") || null,
      gradingCompany: fd.get("gradingCompany") || null,
      certNumber: fd.get("certNumber") || null,
      cardPurcPrice: fd.get("cardPurcPrice") ? Number(fd.get("cardPurcPrice")) : null,
      soldDate: fd.get("soldDate") || null,
      sellPrice: fd.get("sellPrice") ? Number(fd.get("sellPrice")) : null,
      soldSource: fd.get("soldSource") || null,
      stateSold: fd.get("stateSold") || null,
      feeType: fd.get("feeType") || null,
      notes: fd.get("notes") || null,
    };
    const res = await fetch(`/api/collection/transactions/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/collection/transactions");
      router.refresh();
    } else {
      setError(data.error ?? "Save failed");
      setSaving(false);
    }
  };

  const inputClass = "rounded border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm w-full";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Purc. date</label>
          <input name="purcDate" type="date" defaultValue={toInputDate(t.purcDate)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Purc. source</label>
          <input name="purcSource" defaultValue={t.purcSource ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Shipping cost</label>
          <input name="shippingCost" type="number" step="0.01" defaultValue={t.shippingCost ?? 0} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Qty</label>
          <input name="qty" type="number" defaultValue={t.qty ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Year</label>
          <input name="year" defaultValue={t.year ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Set</label>
          <input name="setName" defaultValue={t.setName ?? ""} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-[var(--muted)] mb-1">Player / Character</label>
          <input name="playerCharacter" defaultValue={t.playerCharacter ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Sport</label>
          <input name="sport" defaultValue={t.sport ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Team</label>
          <input name="team" defaultValue={t.team ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Variation</label>
          <input name="variation" defaultValue={t.variation ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Card type</label>
          <input name="cardType" defaultValue={t.cardType ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Card purc. price</label>
          <input name="cardPurcPrice" type="number" step="0.01" defaultValue={t.cardPurcPrice ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Sold date</label>
          <input name="soldDate" type="date" defaultValue={toInputDate(t.soldDate)} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Sell price</label>
          <input name="sellPrice" type="number" step="0.01" defaultValue={t.sellPrice ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Sold source</label>
          <input name="soldSource" defaultValue={t.soldSource ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">State sold</label>
          <input name="stateSold" defaultValue={t.stateSold ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Fee type</label>
          <input name="feeType" defaultValue={t.feeType ?? ""} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-[var(--muted)] mb-1">Card notes</label>
          <input name="cardNotes" defaultValue={t.cardNotes ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Attributes</label>
          <input name="attributes" defaultValue={t.attributes ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">#'d to</label>
          <input name="numberedTo" defaultValue={t.numberedTo ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Grade</label>
          <input name="grade" defaultValue={t.grade ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Grading company</label>
          <input name="gradingCompany" defaultValue={t.gradingCompany ?? ""} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Cert number</label>
          <input name="certNumber" defaultValue={t.certNumber ?? ""} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-[var(--muted)] mb-1">Notes</label>
          <input name="notes" defaultValue={t.notes ?? ""} className={inputClass} />
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius)] bg-[var(--foreground)] text-[var(--background)] px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
