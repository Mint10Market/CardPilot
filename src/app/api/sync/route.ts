import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { syncOrdersForUser } from "@/lib/ebay-sync";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const daysBack = url.searchParams.get("daysBack")
      ? parseInt(url.searchParams.get("daysBack")!, 10)
      : 90;
    const { count } = await syncOrdersForUser(user.id, { daysBack });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Sync error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
