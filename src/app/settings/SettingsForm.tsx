"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/FeedbackContext";

type Profile = {
  id: string;
  displayName: string | null;
  ebayUserId: string | null;
  ebayUsername: string | null;
};

export function SettingsForm() {
  const { showToast } = useFeedback();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const load = useCallback(() => {
    return fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        return data;
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        showToast("Profile updated", "success");
      } else {
        showToast(data.error ?? "Update failed", "error");
      }
    } catch {
      showToast("Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--muted)]">Loading…</p>;

  const ebayConnected = Boolean(profile?.ebayUserId);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Profile</h2>
        <Card className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs text-[var(--muted)] mb-1">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or username"
                className="rounded border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm w-full max-w-sm"
                autoComplete="name"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:opacity-90"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-3">Connections</h2>
        <Card className="max-w-md">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={
                ebayConnected
                  ? "inline-flex items-center gap-2 rounded-full border border-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 text-sm font-medium text-[var(--success)]"
                  : "inline-flex items-center gap-2 rounded-full border border-[var(--muted)] bg-[var(--muted)]/10 px-3 py-1.5 text-sm font-medium text-[var(--muted)]"
              }
              aria-label="eBay connection status"
            >
              <span
                className={`h-2 w-2 rounded-full ${ebayConnected ? "bg-[var(--success)]" : "bg-[var(--muted)]"}`}
                aria-hidden
              />
              {ebayConnected
                ? `eBay: ${profile?.ebayUsername ?? profile?.ebayUserId ?? "Connected"}`
                : "eBay: Not connected"}
            </span>
            <a
              href={ebayConnected ? "/api/auth/ebay" : "/api/auth/ebay"}
              className="rounded-[var(--radius)] bg-[var(--accent)] text-[var(--accent-foreground)] px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              {ebayConnected ? "Reconnect eBay" : "Connect eBay"}
            </a>
          </div>
          <p className="text-sm text-[var(--muted)] mt-3">
            {ebayConnected
              ? "Sync sales and inventory from your eBay account. Reconnect if you need to refresh permissions."
              : "Connect your eBay account to sync orders and inventory."}
          </p>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-medium text-[var(--foreground)] mb-2">Other settings</h2>
        <p className="text-sm text-[var(--muted)]">
          <a href="/collection/settings" className="text-[var(--foreground)] underline">
            Collection settings
          </a>{" "}
          — tax rates, shipping defaults, and sell price goals for your collection.
        </p>
      </section>
    </div>
  );
}
