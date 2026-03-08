import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  cardTransactions,
  userSettings,
  referenceData,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { computeCardTransaction } from "@/lib/collection-calc";
import { handleApiError } from "@/lib/api-response";

function toDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) return val;
  const s = String(val).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const x = typeof val === "string" ? parseFloat(val) : Number(val);
  return Number.isFinite(x) ? x : null;
}

function toStr(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const row = await db.query.cardTransactions.findFirst({
      where: and(
        eq(cardTransactions.id, id),
        eq(cardTransactions.userId, user.id)
      ),
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const settingsRow = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id),
    });
    const settings = settingsRow
      ? {
          salesTaxRate: settingsRow.salesTaxRate ?? 0,
          shippingUnder20: settingsRow.shippingUnder20 ?? 0,
          shippingOver20: settingsRow.shippingOver20 ?? 0,
          sellingProfitGoal: settingsRow.sellingProfitGoal ?? 0.2,
          inStockStatus: settingsRow.inStockStatus ?? "Available",
        }
      : undefined;

    const stateTaxList = await db.query.referenceData.findMany({
      where: eq(referenceData.type, "state_tax_rates"),
      columns: { value: true, meta: true },
    });
    const stateTaxRates = new Map<string, number>();
    for (const r of stateTaxList) {
      const rate = (r.meta as { rate?: number } | null)?.rate;
      if (typeof rate === "number") stateTaxRates.set(r.value, rate);
    }

    const purcDate = toDate(body.purcDate ?? body.purc_date);
    const soldDate = toDate(body.soldDate ?? body.sold_date);
    const inputs = {
      purcDate: purcDate ? purcDate.toISOString().slice(0, 10) : null,
      purcSource: toStr(body.purcSource ?? body.purc_source),
      shippingCost: toNum(body.shippingCost ?? body.shipping_cost) ?? 0,
      qty: toNum(body.qty) ?? null,
      cardPurcPrice: toNum(body.cardPurcPrice ?? body.card_purc_price) ?? null,
      soldDate: soldDate ? soldDate.toISOString().slice(0, 10) : null,
      sellPrice: toNum(body.sellPrice ?? body.sell_price) ?? null,
      feeType: toStr(body.feeType ?? body.fee_type),
      stateSold: toStr(body.stateSold ?? body.state_sold),
    };
    const computed = computeCardTransaction(inputs, settings, stateTaxRates);

    const update: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.purcDate !== undefined) update.purcDate = purcDate;
    if (body.purcSource !== undefined) update.purcSource = toStr(body.purcSource);
    if (body.shippingCost !== undefined) update.shippingCost = String(inputs.shippingCost);
    if (body.qty !== undefined) update.qty = inputs.qty;
    if (body.year !== undefined) update.year = toStr(body.year);
    if (body.setName !== undefined) update.setName = toStr(body.setName);
    if (body.variation !== undefined) update.variation = toStr(body.variation);
    if (body.cardType !== undefined) update.cardType = toStr(body.cardType);
    if (body.playerCharacter !== undefined) update.playerCharacter = toStr(body.playerCharacter);
    if (body.sport !== undefined) update.sport = toStr(body.sport);
    if (body.team !== undefined) update.team = toStr(body.team);
    if (body.cardNotes !== undefined) update.cardNotes = toStr(body.cardNotes);
    if (body.attributes !== undefined) update.attributes = toStr(body.attributes);
    if (body.numberedTo !== undefined) update.numberedTo = toStr(body.numberedTo);
    if (body.grade !== undefined) update.grade = toStr(body.grade);
    if (body.gradingCompany !== undefined) update.gradingCompany = toStr(body.gradingCompany);
    if (body.certNumber !== undefined) update.certNumber = toStr(body.certNumber);
    if (body.cardPurcPrice !== undefined) update.cardPurcPrice = body.cardPurcPrice != null ? String(body.cardPurcPrice) : null;
    if (body.soldDate !== undefined) update.soldDate = soldDate;
    if (body.sellPrice !== undefined) update.sellPrice = body.sellPrice != null ? String(body.sellPrice) : null;
    if (body.soldSource !== undefined) update.soldSource = toStr(body.soldSource);
    if (body.stateSold !== undefined) update.stateSold = toStr(body.stateSold);
    if (body.feeType !== undefined) update.feeType = toStr(body.feeType);
    update.salesTax = computed.salesTax != null ? String(computed.salesTax) : null;
    update.totalCost = computed.totalCost != null ? String(computed.totalCost) : null;
    update.suggestedListPrice = computed.suggestedListPrice != null ? String(computed.suggestedListPrice) : null;
    update.sellPriceGoal = computed.sellPriceGoal != null ? String(computed.sellPriceGoal) : null;
    update.breakevenEbay = computed.breakevenEbay != null ? String(computed.breakevenEbay) : null;
    update.breakevenOther = computed.breakevenOther != null ? String(computed.breakevenOther) : null;
    update.status = computed.status;
    update.sellingFees = computed.sellingFees != null ? String(computed.sellingFees) : null;
    update.profitDollars = computed.profitDollars != null ? String(computed.profitDollars) : null;
    update.profitPct = computed.profitPct != null ? String(computed.profitPct) : null;
    update.metGoal = computed.metGoal;
    update.profitLoss = computed.profitLoss;
    if (body.notes !== undefined) update.notes = toStr(body.notes);

    const [updated] = await db
      .update(cardTransactions)
      .set(update as Record<string, string | number | Date | null>)
      .where(and(eq(cardTransactions.id, id), eq(cardTransactions.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const [deleted] = await db
      .delete(cardTransactions)
      .where(and(eq(cardTransactions.id, id), eq(cardTransactions.userId, user.id)))
      .returning({ id: cardTransactions.id });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
