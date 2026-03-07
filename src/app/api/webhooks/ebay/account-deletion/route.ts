import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VERIFICATION_TOKEN = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN!;

export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode || !VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "Missing challenge_code or verification token" }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const endpoint = `${url}/api/webhooks/ebay/account-deletion`;
  const hash = createHash("sha256");
  hash.update(challengeCode);
  hash.update(VERIFICATION_TOKEN);
  hash.update(endpoint);
  return NextResponse.json({ challengeResponse: hash.digest("hex") }, { status: 200 });
}

type Payload = { notification?: { data?: { userId?: string } } };

export async function POST(request: NextRequest) {
  if (!VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ebayUserId = body.notification?.data?.userId;
  if (!ebayUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const user = await db.query.users.findFirst({
    where: eq(users.ebayUserId, ebayUserId),
    columns: { id: true },
  });
  if (user) await db.delete(users).where(eq(users.id, user.id));
  return new NextResponse(null, { status: 200 });
}
