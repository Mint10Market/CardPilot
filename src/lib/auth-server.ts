import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSessionCookieName } from "@/lib/session";

export type CurrentUser = {
  id: string;
  ebayUserId: string | null;
  ebayUsername: string | null;
  displayName: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, ebayUserId: true, ebayUsername: true, displayName: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    ebayUserId: user.ebayUserId ?? null,
    ebayUsername: user.ebayUsername ?? null,
    displayName: user.displayName ?? null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
