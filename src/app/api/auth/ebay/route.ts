import { NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/lib/ebay-auth";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(24).toString("hex");
  const url = getEbayAuthUrl(state);
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
