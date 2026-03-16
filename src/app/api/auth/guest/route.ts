import { NextResponse } from "next/server";
import { createSession, getSessionCookieName, SESSION_MAX_AGE } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GET /api/auth/guest — create an app-only user (no eBay) and sign in.
 * Redirects to /dashboard. Use "Continue without connecting" on the home page.
 * Requires migration 0005_users_optional_ebay_display_name.sql on the DB.
 * Requires SESSION_SECRET (≥32 chars) in Vercel env.
 * Uses the request origin for redirects so the session cookie and destination match (same host).
 */
export async function GET(request: Request) {
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = typeof request.url === "string" ? new URL(request.url).origin : fallback;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error("[guest] SESSION_SECRET missing or too short (need ≥32 chars)");
    return NextResponse.redirect(
      `${url}/?error=config&message=${encodeURIComponent("Server misconfiguration: SESSION_SECRET must be set in Vercel (≥32 characters). See DEPLOY.md.")}`
    );
  }

  let inserted: { id: string } | undefined;
  try {
    [inserted] = await db
      .insert(users)
      .values({})
      .returning({ id: users.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[guest] DB insert failed:", msg);
    if (/not-null|null value in column|violates not-null/i.test(msg)) {
      return NextResponse.redirect(
        `${url}/?error=config&message=${encodeURIComponent("Guest sign-in requires a database migration. Run: npm run db:migrate (see DEPLOY.md).")}`
      );
    }
    return NextResponse.redirect(
      `${url}/?error=config&message=${encodeURIComponent("Database error. Check Vercel function logs for /api/auth/guest.")}`
    );
  }

  if (!inserted) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  try {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[guest] createSession failed:", msg);
    return NextResponse.redirect(
      `${url}/?error=config&message=${encodeURIComponent("Session setup failed. Ensure SESSION_SECRET is set in Vercel (≥32 chars).")}`
    );
  }
}
