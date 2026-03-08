import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await requireUser();
    const row = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncCount: true,
        lastSyncError: true,
      },
    });
    return NextResponse.json({
      lastSyncAt: row?.lastSyncAt ?? null,
      status: row?.lastSyncStatus ?? null,
      count: row?.lastSyncCount ?? null,
      error: row?.lastSyncError ?? null,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
