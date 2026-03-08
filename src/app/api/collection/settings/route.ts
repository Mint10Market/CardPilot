import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await requireUser();
    const row = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id),
    });
    if (!row) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId: user.id })
        .returning();
      return NextResponse.json(created ?? {});
    }
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      salesTaxRate?: string | number;
      shippingUnder20?: string | number;
      shippingOver20?: string | number;
      sellingProfitGoal?: string | number;
      inStockStatus?: string;
    };
    const updates: Record<string, string | number | Date> = { updatedAt: new Date() };
    if (body.salesTaxRate !== undefined) updates.salesTaxRate = String(body.salesTaxRate);
    if (body.shippingUnder20 !== undefined) updates.shippingUnder20 = String(body.shippingUnder20);
    if (body.shippingOver20 !== undefined) updates.shippingOver20 = String(body.shippingOver20);
    if (body.sellingProfitGoal !== undefined) updates.sellingProfitGoal = String(body.sellingProfitGoal);
    if (body.inStockStatus !== undefined) updates.inStockStatus = body.inStockStatus;

    const [updated] = await db
      .update(userSettings)
      .set(updates)
      .where(eq(userSettings.userId, user.id))
      .returning();
    if (!updated) {
      await db.insert(userSettings).values({
        userId: user.id,
        salesTaxRate: body.salesTaxRate !== undefined ? String(body.salesTaxRate) : "0",
        shippingUnder20: body.shippingUnder20 !== undefined ? String(body.shippingUnder20) : "0",
        shippingOver20: body.shippingOver20 !== undefined ? String(body.shippingOver20) : "0",
        sellingProfitGoal: body.sellingProfitGoal !== undefined ? String(body.sellingProfitGoal) : "0.2",
        inStockStatus: body.inStockStatus ?? "Available",
      });
      const row = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id),
      });
      return NextResponse.json(row ?? {});
    }
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
