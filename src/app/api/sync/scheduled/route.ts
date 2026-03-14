import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { syncOrdersForUser } from "@/lib/ebay-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled eBay sync for all users with eBay connected.
 * Invoked by Trigger.dev (scheduled task) or external scheduler.
 * Auth: Authorization: Bearer <CRON_SECRET>. GET and POST accepted.
 */
async function runScheduledSync(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allUsers = await db.select({ id: users.id }).from(users);
  const results: { userId: string; count?: number; error?: string }[] = [];
  const now = new Date();

  for (const { id } of allUsers) {
    try {
      const { count } = await syncOrdersForUser(id, { daysBack: 90 });
      await db
        .update(users)
        .set({
          lastSyncAt: now,
          lastSyncStatus: "success",
          lastSyncCount: count,
          lastSyncError: null,
          updatedAt: now,
        })
        .where(eq(users.id, id));
      results.push({ userId: id, count });
    } catch (e) {
      const errMessage = e instanceof Error ? e.message : String(e);
      await db
        .update(users)
        .set({
          lastSyncAt: now,
          lastSyncStatus: "error",
          lastSyncCount: null,
          lastSyncError: errMessage,
          updatedAt: now,
        })
        .where(eq(users.id, id));
      results.push({ userId: id, error: errMessage });
    }
  }

  return NextResponse.json({
    ok: true,
    synced: results.filter((r) => r.count != null).length,
    failed: results.filter((r) => r.error).length,
    results,
  });
}

export async function GET(request: Request) {
  return runScheduledSync(request);
}

/** Trigger.dev scheduled task uses POST. */
export async function POST(request: Request) {
  return runScheduledSync(request);
}
