/**
 * Trigger.dev scheduled tasks that call Card Pilot API routes.
 * Set in Trigger.dev dashboard: APP_URL, CRON_SECRET.
 */
import { schedules } from "@trigger.dev/sdk";

const getConfig = () => {
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base?.startsWith("http")) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL must be set (e.g. https://card-pilot.vercel.app)");
  }
  if (!secret) {
    throw new Error("CRON_SECRET must be set in Trigger.dev environment");
  }
  return { base: base.replace(/\/$/, ""), secret };
};

/** Daily eBay order sync for all users (midnight UTC). */
export const ebaySyncScheduled = schedules.task({
  id: "ebay-sync-scheduled",
  cron: "0 0 * * *",
  run: async () => {
    const { base, secret } = getConfig();
    const url = `${base}/api/sync/scheduled`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`eBay sync failed ${res.status}: ${text}`);
    }
    return { ok: true, status: res.status, body: text.slice(0, 500) };
  },
});

/** Hourly card shows refresh. */
export const showsRefreshScheduled = schedules.task({
  id: "shows-refresh-scheduled",
  cron: "0 * * * *",
  run: async () => {
    const { base, secret } = getConfig();
    const url = `${base}/api/shows/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Shows refresh failed ${res.status}: ${text}`);
    }
    return { ok: true, status: res.status, body: text.slice(0, 500) };
  },
});
