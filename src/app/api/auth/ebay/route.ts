import { NextRequest, NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/lib/ebay-auth";
import { randomBytes } from "crypto";

export async function GET(request: NextRequest) {
  const state = randomBytes(24).toString("hex");
  // Use EBAY_REDIRECT_URI when set so it matches the URI registered in eBay Developer Portal exactly.
  const redirectUri =
    process.env.EBAY_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/ebay/callback`;
  const url = getEbayAuthUrl(state, redirectUri);
  const res = NextResponse.redirect(url);
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return res;
}
