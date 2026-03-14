import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export type ProfileResponse = {
  id: string;
  displayName: string | null;
  ebayUserId: string | null;
  ebayUsername: string | null;
};

export async function GET() {
  try {
    const user = await requireUser();
    const row = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { id: true, displayName: true, ebayUserId: true, ebayUsername: true },
    });
    if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      id: row.id,
      displayName: row.displayName ?? null,
      ebayUserId: row.ebayUserId ?? null,
      ebayUsername: row.ebayUsername ?? null,
    } satisfies ProfileResponse);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as { displayName?: string | null };
    const updates: { displayName?: string | null; updatedAt: Date } = { updatedAt: new Date() };
    if (body.displayName !== undefined) {
      updates.displayName =
        typeof body.displayName === "string" && body.displayName.trim() !== ""
          ? body.displayName.trim()
          : null;
    }
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning({ id: users.id, displayName: users.displayName, ebayUserId: users.ebayUserId, ebayUsername: users.ebayUsername });
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      id: updated.id,
      displayName: updated.displayName ?? null,
      ebayUserId: updated.ebayUserId ?? null,
      ebayUsername: updated.ebayUsername ?? null,
    } satisfies ProfileResponse);
  } catch (e) {
    return handleApiError(e);
  }
}
