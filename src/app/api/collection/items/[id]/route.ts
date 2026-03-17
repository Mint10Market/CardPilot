import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { getCollectionItem } from "@/lib/collection-items";
import { db } from "@/lib/db";
import { personalCollectionItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const item = await getCollectionItem(id, user.id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await getCollectionItem(id, user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = (await request.json()) as {
      title?: string;
      category?: string;
      year?: string;
      setName?: string;
      playerOrSubject?: string;
      notes?: string;
      acquiredDate?: string | null;
      estimatedValue?: string | number | null;
    };
    const update: {
      updatedAt: Date;
      title?: string;
      category?: string | null;
      year?: string | null;
      setName?: string | null;
      playerOrSubject?: string | null;
      notes?: string | null;
      acquiredDate?: Date | null;
      estimatedValue?: string | null;
    } = { updatedAt: new Date() };
    if (body.title !== undefined) update.title = body.title.trim();
    if (body.category !== undefined) update.category = body.category?.trim() ?? null;
    if (body.year !== undefined) update.year = body.year?.trim() ?? null;
    if (body.setName !== undefined) update.setName = body.setName?.trim() ?? null;
    if (body.playerOrSubject !== undefined)
      update.playerOrSubject = body.playerOrSubject?.trim() ?? null;
    if (body.notes !== undefined) update.notes = body.notes?.trim() ?? null;
    if (body.acquiredDate !== undefined) {
      const d = body.acquiredDate && String(body.acquiredDate).trim() ? new Date(body.acquiredDate) : null;
      update.acquiredDate = d && !Number.isNaN(d.getTime()) ? d : null;
    }
    if (body.estimatedValue !== undefined) {
      const v = body.estimatedValue;
      update.estimatedValue =
        v != null && v !== ""
          ? Number.isFinite(typeof v === "number" ? v : parseFloat(String(v)))
            ? String(v)
            : null
          : null;
    }
    const [updated] = await db
      .update(personalCollectionItems)
      .set(update)
      .where(and(eq(personalCollectionItems.id, id), eq(personalCollectionItems.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await getCollectionItem(id, user.id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db
      .delete(personalCollectionItems)
      .where(and(eq(personalCollectionItems.id, id), eq(personalCollectionItems.userId, user.id)));
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
