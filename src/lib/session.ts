import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "cardpilot_session";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  ebayUserId: string | null;
  exp: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_MAX_AGE;
  return await new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    if (!payload.userId || payload.ebayUserId === undefined || !payload.exp) return null;
    if (payload.exp < Date.now() / 1000) return null;
    return {
      userId: payload.userId as string,
      ebayUserId: payload.ebayUserId as string | null,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export { DEFAULT_MAX_AGE as SESSION_MAX_AGE };
