import { NextResponse } from "next/server";
import { refreshShows } from "@/lib/refresh-shows";

export async function POST() {
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
