import { NextRequest, NextResponse } from "next/server";
import { refreshShows } from "@/lib/refresh-shows";
import { requireUser } from "@/lib/auth-server";

/**
 * Refresh card shows from configured sources.
 * Auth: CRON_SECRET (Authorization: Bearer <CRON_SECRET>) for cron, or authenticated user (session).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const isCron = Boolean(secret && auth === `Bearer ${secret}`);

  if (!isCron) {
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
