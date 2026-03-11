import { NextRequest, NextResponse } from "next/server";
import { refreshShows } from "@/lib/refresh-shows";

/**
 * Refresh card shows from configured sources. Secured by CRON_SECRET:
 * caller must send Authorization: Bearer <CRON_SECRET> (same as /api/sync/scheduled).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { count } = await refreshShows();
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("Refresh shows error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
