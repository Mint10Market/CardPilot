import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const list = await db.query.customers.findMany({
      where: search
        ? and(eq(customers.userId, user.id), ilike(customers.identifier, `%${search}%`))
        : eq(customers.userId, user.id),
      orderBy: (c, { asc }) => [asc(c.displayName ?? c.identifier)],
    });
    return NextResponse.json(list);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      identifier: string;
      displayName?: string;
      email?: string;
      notes?: string;
    };
    if (!body.identifier?.trim()) {
      return NextResponse.json({ error: "identifier required" }, { status: 400 });
    }
    const [created] = await db
      .insert(customers)
      .values({
        userId: user.id,
        identifier: body.identifier.trim(),
        displayName: body.displayName?.trim() ?? null,
        email: body.email?.trim() ?? null,
        notes: body.notes?.trim() ?? null,
        source: "manual",
      })
      .returning();
    return NextResponse.json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
