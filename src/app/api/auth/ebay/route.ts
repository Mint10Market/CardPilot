import { NextRequest, NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/lib/ebay-auth";
import { randomBytes } from "crypto";

/**
 * Browsers often do not persist cookies set on a 302 redirect to an external domain
 * (e.g. eBay), which causes "Session state didn't match" on the callback.
 * Return 200 with an HTML redirect so the cookie is stored before navigation.
 */
export async function GET(request: NextRequest) {
  const state = randomBytes(24).toString("hex");
  const redirectUri =
    process.env.EBAY_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/ebay/callback`;
  const ebayAuthUrl = getEbayAuthUrl(state, redirectUri);
  const isProd = process.env.NODE_ENV === "production";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escapeHtml(ebayAuthUrl)}"></head><body>Redirecting to eBay…</body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return res;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
