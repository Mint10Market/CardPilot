import { NextRequest, NextResponse } from "next/server";
import { refreshShows } from "@/lib/refresh-shows";
import { requireUser } from "@/lib/auth-server";

/**
 * Refresh card shows from configured sources.
 * Auth: Trigger.dev/scheduler sends Authorization: Bearer <CRON_SECRET>; or authenticated user (session).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isScheduledCall = Boolean(secret && auth === `Bearer ${secret}`);

  if (!isScheduledCall) {
    try {
      await requireUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { count } = await refreshShows();
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("Refresh shows error:", e);
    const message = e instanceof Error ? e.message : "Refresh failed";
    const isSchemaError =
      typeof message === "string" &&
      (message.includes("buyer_entry_cost") ||
        message.includes("vendor_booth_cost") ||
        message.includes("column") ||
        message.includes("Failed query"));
    const error =
      isSchemaError
        ? "Card shows table is missing columns. Run the database migration (see DEPLOY.md)."
        : message;
    return NextResponse.json({ error }, { status: 500 });
  }
}
