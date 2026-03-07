import { NextResponse } from "next/server";
import { getEbayAuthUrl } from "@/lib/ebay-auth";
import { randomBytes } from "crypto";

export async function GET() {
  const state = randomBytes(24).toString("hex");
  const url = getEbayAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("ebay_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  return res;
}
