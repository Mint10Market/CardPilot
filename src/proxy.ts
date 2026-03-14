import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "cardpilot_session";
const PROTECTED_PREFIXES = ["/dashboard", "/sales", "/inventory", "/customers", "/shows", "/collection", "/settings"];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  const isAuthRoute =
    path.startsWith("/api/auth/ebay") ||
    path === "/api/auth/ebay" ||
    path === "/api/auth/guest" ||
    path.startsWith("/api/webhooks");
  if (isAuthRoute || !isProtected) return NextResponse.next();
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/sales/:path*", "/inventory/:path*", "/customers/:path*", "/shows/:path*", "/collection/:path*", "/settings/:path*"],
};
