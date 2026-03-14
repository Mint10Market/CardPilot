import {
  schedules_exports
} from "../../../../../../../chunk-YQQI7LRT.mjs";
import "../../../../../../../chunk-E3YT2BTV.mjs";
import {
  __name,
  init_esm
} from "../../../../../../../chunk-ESLEIWM3.mjs";

// trigger/card-pilot-schedules.ts
init_esm();
var getConfig = /* @__PURE__ */ __name(() => {
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base?.startsWith("http")) {
    throw new Error("APP_URL or NEXT_PUBLIC_APP_URL must be set (e.g. https://card-pilot.vercel.app)");
  }
  if (!secret) {
    throw new Error("CRON_SECRET must be set in Trigger.dev environment");
  }
  return { base: base.replace(/\/$/, ""), secret };
}, "getConfig");
var ebaySyncScheduled = schedules_exports.task({
  id: "ebay-sync-scheduled",
  cron: "0 0 * * *",
  run: /* @__PURE__ */ __name(async () => {
    const { base, secret } = getConfig();
    const url = `${base}/api/sync/scheduled`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`eBay sync failed ${res.status}: ${text}`);
    }
    return { ok: true, status: res.status, body: text.slice(0, 500) };
  }, "run")
});
var showsRefreshScheduled = schedules_exports.task({
  id: "shows-refresh-scheduled",
  cron: "0 * * * *",
  run: /* @__PURE__ */ __name(async () => {
    const { base, secret } = getConfig();
    const url = `${base}/api/shows/refresh`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` }
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Shows refresh failed ${res.status}: ${text}`);
    }
    return { ok: true, status: res.status, body: text.slice(0, 500) };
  }, "run")
});
export {
  ebaySyncScheduled,
  showsRefreshScheduled
};
//# sourceMappingURL=card-pilot-schedules.mjs.map
