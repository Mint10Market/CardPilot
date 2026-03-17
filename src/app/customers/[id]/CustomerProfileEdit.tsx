"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  customerId: string;
  displayName: string | null;
  identifier: string;
  source: string;
  email: string | null;
  notes: string | null;
};

export function CustomerProfileEdit({
  customerId,
  displayName,
  identifier,
  source,
  email,
  notes,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayNameVal, setDisplayNameVal] = useState(displayName ?? "");
  const [emailVal, setEmailVal] = useState(email ?? "");
  const [notesVal, setNotesVal] = useState(notes ?? "");

  useEffect(() => {
    setDisplayNameVal(displayName ?? "");
    setEmailVal(email ?? "");
    setNotesVal(notes ?? "");
  }, [displayName, email, notes]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayNameVal.trim() || null,
          email: emailVal.trim() || null,
          notes: notesVal.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      {!editing ? (
        <>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            {displayName || identifier}
          </h1>
          <p className="text-[var(--muted)] mt-1">
            {identifier} · {source}
          </p>
          {email ? (
            <p className="text-[var(--muted)] mt-1">Email: {email}</p>
          ) : null}
          {notes ? (
            <p className="text-[var(--muted)] mt-2">{notes}</p>
          ) : null}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-3 text-sm text-[var(--accent)] hover:underline"
          >
            Edit
          </button>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Display name</span>
            <input
              type="text"
              value={displayNameVal}
              onChange={(e) => setDisplayNameVal(e.target.value)}
              className="mt-1 w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              className="mt-1 w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Notes</span>
            <textarea
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              rows={2}
              className="mt-1 w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-[var(--foreground)]"
            />
          </label>
          <p className="text-[var(--muted)] text-sm">{identifier} · {source} (read-only)</p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDisplayNameVal(displayName ?? "");
                setEmailVal(email ?? "");
                setNotesVal(notes ?? "");
              }}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--table-header)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
