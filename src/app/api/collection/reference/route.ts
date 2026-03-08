import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { referenceData } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type")?.trim();

    if (!type) {
      return NextResponse.json(
        { error: "type required (e.g. state_tax_rates, expense_categories)" },
        { status: 400 }
      );
    }

    const rows = await db
      .select({ value: referenceData.value, meta: referenceData.meta })
      .from(referenceData)
      .where(and(eq(referenceData.type, type), isNull(referenceData.userId)));

    return NextResponse.json(rows.map((r) => ({ value: r.value, meta: r.meta })));
  } catch (e) {
    return handleApiError(e);
  }
}
