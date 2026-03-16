import { NextResponse } from "next/server";
import { createSession, getSessionCookieName, SESSION_MAX_AGE } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GET /api/auth/guest — create an app-only user (no eBay) and sign in.
 * Redirects to /dashboard. Use "Continue without connecting" on the home page.
 * Requires migration 0005_users_optional_ebay_display_name.sql on the DB.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let inserted: { id: string } | undefined;
  try {
    [inserted] = await db
      .insert(users)
      .values({})
      .returning({ id: users.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/not-null|null value in column|violates not-null/i.test(msg)) {
      return NextResponse.redirect(
        `${url}/?error=config&message=${encodeURIComponent("Guest sign-in requires a database migration. Run: npm run db:migrate (see DEPLOY.md).")}`
      );
    }
    throw e;
  }

  if (!inserted) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  const token = await createSession({ userId: inserted.id, ebayUserId: null });
  const res = NextResponse.redirect(`${url}/dashboard`);
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
