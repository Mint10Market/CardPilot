import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getEbayUser } from "@/lib/ebay-auth";
import { logger } from "@/lib/logger";
import { createSession, getSessionCookieName, SESSION_MAX_AGE } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const baseUrl = (request: NextRequest) =>
  process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin || "http://localhost:3000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("ebay_oauth_state")?.value;
  const url = baseUrl(request);
  const redirectUri = `${request.nextUrl.origin}/api/auth/ebay/callback`;

  if (!code) return NextResponse.redirect(`${url}/?error=missing_code`);
  if (state !== savedState) return NextResponse.redirect(`${url}/?error=invalid_state`);

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const ebayUser = await getEbayUser(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const existing = await db.query.users.findFirst({
      where: eq(users.ebayUserId, ebayUser.userId),
    });

    let userId: string;
    if (existing) {
      await db
        .update(users)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          ebayUsername: ebayUser.username ?? existing.ebayUsername,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
      userId = existing.id;
    } else {
      const [inserted] = await db
        .insert(users)
        .values({
          ebayUserId: ebayUser.userId,
          ebayUsername: ebayUser.username ?? null,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
        })
        .returning({ id: users.id });
      if (!inserted) {
        logger.error("eBay callback: user insert returned no row");
        return NextResponse.redirect(`${url}/?error=auth_failed`);
      }
      userId = inserted.id;
    }

    const token = await createSession({ userId, ebayUserId: ebayUser.userId });
    const res = NextResponse.redirect(`${url}/dashboard`);
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
    res.cookies.delete("ebay_oauth_state");
    return res;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logger.error("eBay callback error: %s", err.message);
    if (err.stack) logger.error("%s", err.stack);
    return NextResponse.redirect(`${url}/?error=auth_failed`);
  }
}
