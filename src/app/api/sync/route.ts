import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { syncOrdersForUser } from "@/lib/ebay-sync";
import { handleApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const raw = url.searchParams.get("daysBack");
    const parsed = raw != null ? parseInt(raw, 10) : NaN;
    const daysBack = Number.isFinite(parsed) ? parsed : 90;
    const now = new Date();
    try {
      const { count } = await syncOrdersForUser(user.id, { daysBack });
      await db
        .update(users)
        .set({
          lastSyncAt: now,
          lastSyncStatus: "success",
          lastSyncCount: count,
          lastSyncError: null,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
      return NextResponse.json({ ok: true, count, lastSyncAt: now.toISOString() });
    } catch (syncErr) {
      const errMessage = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await db
        .update(users)
        .set({
          lastSyncAt: now,
          lastSyncStatus: "error",
          lastSyncCount: null,
          lastSyncError: errMessage,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
      throw syncErr;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
