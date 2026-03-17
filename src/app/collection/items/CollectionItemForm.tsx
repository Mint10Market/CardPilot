"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";

type Props = {
  itemId: string | null; // null = create
  initial: {
    title: string;
    category: string;
    year: string;
    setName: string;
    playerOrSubject: string;
    notes: string;
    acquiredDate: string;
    estimatedValue: string;
  };
};

export function CollectionItemForm({ itemId, initial }: Props) {
  const router = useRouter();
  const { showToast } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [year, setYear] = useState(initial.year);
  const [setName, setSetName] = useState(initial.setName);
  const [playerOrSubject, setPlayerOrSubject] = useState(initial.playerOrSubject);
  const [notes, setNotes] = useState(initial.notes);
  const [acquiredDate, setAcquiredDate] = useState(initial.acquiredDate);
  const [estimatedValue, setEstimatedValue] = useState(initial.estimatedValue);

  useEffect(() => {
    setTitle(initial.title);
    setCategory(initial.category);
    setYear(initial.year);
    setSetName(initial.setName);
    setPlayerOrSubject(initial.playerOrSubject);
    setNotes(initial.notes);
    setAcquiredDate(initial.acquiredDate);
    setEstimatedValue(initial.estimatedValue);
  }, [initial.title, initial.category, initial.year, initial.setName, initial.playerOrSubject, initial.notes, initial.acquiredDate, initial.estimatedValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const url = itemId ? `/api/collection/items/${itemId}` : "/api/collection/items";
      const method = itemId ? "PATCH" : "POST";
      const body = {
        title: title.trim(),
        category: category.trim() || undefined,
        year: year.trim() || undefined,
        setName: setName.trim() || undefined,
        playerOrSubject: playerOrSubject.trim() || undefined,
        notes: notes.trim() || undefined,
        acquiredDate: acquiredDate.trim() || null,
        estimatedValue: estimatedValue.trim() ? estimatedValue.trim() : null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      showToast(itemId ? "Item updated." : "Item added.", "success");
      router.push("/collection");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Category
            </label>
            <input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Baseball"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Year
            </label>
            <input
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="setName" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Set name
          </label>
          <input
            id="setName"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="playerOrSubject" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Player / Subject
          </label>
          <input
            id="playerOrSubject"
            value={playerOrSubject}
            onChange={(e) => setPlayerOrSubject(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="acquiredDate" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Acquired date
            </label>
            <input
              id="acquiredDate"
              type="date"
              value={acquiredDate}
              onChange={(e) => setAcquiredDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="estimatedValue" className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Est. value
            </label>
            <input
              id="estimatedValue"
              type="text"
              inputMode="decimal"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-[var(--foreground)] mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
          >
            {saving ? "Saving…" : itemId ? "Save changes" : "Add item"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/collection")}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:border-[var(--muted)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
