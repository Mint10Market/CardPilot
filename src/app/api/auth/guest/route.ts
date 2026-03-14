import { NextResponse } from "next/server";
import { createSession, getSessionCookieName, SESSION_MAX_AGE } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * GET /api/auth/guest — create an app-only user (no eBay) and sign in.
 * Redirects to /dashboard. Use "Continue without connecting" on the home page.
 */
export async function GET() {
  const [inserted] = await db
    .insert(users)
    .values({})
    .returning({ id: users.id });
  if (!inserted) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  const token = await createSession({ userId: inserted.id, ebayUserId: null });
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
