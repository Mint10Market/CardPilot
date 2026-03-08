import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { syncOrdersForUser } from "@/lib/ebay-sync";
import { handleApiError } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const raw = url.searchParams.get("daysBack");
    const parsed = raw != null ? parseInt(raw, 10) : NaN;
    const daysBack = Number.isFinite(parsed) ? parsed : 90;
    const { count } = await syncOrdersForUser(user.id, { daysBack });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return handleApiError(e);
  }
}
