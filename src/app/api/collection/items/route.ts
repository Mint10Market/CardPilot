import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { getCollectionItems } from "@/lib/collection-items";
import { db } from "@/lib/db";
import { personalCollectionItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const sort = (searchParams.get("sort") as "title" | "acquiredDate" | "estimatedValue") ?? "title";
    const order = (searchParams.get("order") as "asc" | "desc") ?? "asc";
    const list = await getCollectionItems(user.id, { search, category, sort, order });
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
      title: string;
      category?: string;
      itemKind?: string | null;
      sportOrTcg?: string | null;
      extraDetails?: Record<string, unknown> | null;
      imageUrl?: string | null;
      year?: string;
      setName?: string;
      playerOrSubject?: string;
      notes?: string;
      acquiredDate?: string | null;
      estimatedValue?: string | number | null;
    };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const estimatedValue =
      body.estimatedValue != null && body.estimatedValue !== ""
        ? String(
            typeof body.estimatedValue === "number"
              ? body.estimatedValue
              : parseFloat(String(body.estimatedValue))
          )
        : null;
    const acquiredDate =
      body.acquiredDate && String(body.acquiredDate).trim()
        ? new Date(body.acquiredDate)
        : null;
    const extra =
      body.extraDetails != null && typeof body.extraDetails === "object" && !Array.isArray(body.extraDetails)
        ? body.extraDetails
        : null;
    const [created] = await db
      .insert(personalCollectionItems)
      .values({
        userId: user.id,
        title: body.title.trim(),
        category: body.category?.trim() ?? null,
        itemKind: body.itemKind?.trim() || null,
        sportOrTcg: body.sportOrTcg?.trim() || null,
        extraDetails: extra,
        imageUrl: body.imageUrl?.trim() || null,
        year: body.year?.trim() ?? null,
        setName: body.setName?.trim() ?? null,
        playerOrSubject: body.playerOrSubject?.trim() ?? null,
        notes: body.notes?.trim() ?? null,
        acquiredDate: Number.isNaN(acquiredDate?.getTime()) ? null : acquiredDate,
        estimatedValue:
          estimatedValue !== null && Number.isFinite(parseFloat(estimatedValue))
            ? estimatedValue
            : null,
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
