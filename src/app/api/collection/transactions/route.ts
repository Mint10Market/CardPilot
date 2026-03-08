import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  cardTransactions,
  userSettings,
  referenceData,
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get("sport")?.trim() || undefined;
    const status = searchParams.get("status")?.trim() || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const conditions = [eq(cardTransactions.userId, user.id)];
    if (sport) conditions.push(eq(cardTransactions.sport, sport));
    if (status) conditions.push(eq(cardTransactions.status, status));

    const list = await db
      .select()
      .from(cardTransactions)
      .where(and(...conditions))
      .orderBy(desc(cardTransactions.purcDate), desc(cardTransactions.createdAt))
      .limit(limit)
      .offset(offset);
    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cardTransactions)
      .where(and(...conditions));
    return NextResponse.json({
      items: list,
      total: total[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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

    const purcDate = toDate(body.purcDate);
    const soldDate = toDate(body.soldDate);
    const inputs = {
      purcDate: purcDate ? purcDate.toISOString().slice(0, 10) : null,
      purcSource: toStr(body.purcSource),
      shippingCost: toNum(body.shippingCost) ?? 0,
      qty: toNum(body.qty) ?? null,
      cardPurcPrice: toNum(body.cardPurcPrice) ?? null,
      soldDate: soldDate ? soldDate.toISOString().slice(0, 10) : null,
      sellPrice: toNum(body.sellPrice) ?? null,
      feeType: toStr(body.feeType),
      stateSold: toStr(body.stateSold),
    };
    const computed = computeCardTransaction(inputs, settings, stateTaxRates);

    const [inserted] = await db
      .insert(cardTransactions)
      .values({
        userId: user.id,
        purcDate,
        purcSource: toStr(body.purcSource),
        shippingCost: String(inputs.shippingCost),
        qty: inputs.qty,
        year: toStr(body.year),
        setName: toStr(body.setName),
        variation: toStr(body.variation),
        cardType: toStr(body.cardType),
        playerCharacter: toStr(body.playerCharacter),
        sport: toStr(body.sport),
        team: toStr(body.team),
        cardNotes: toStr(body.cardNotes),
        attributes: toStr(body.attributes),
        numberedTo: toStr(body.numberedTo),
        grade: toStr(body.grade),
        gradingCompany: toStr(body.gradingCompany),
        certNumber: toStr(body.certNumber),
        cardPurcPrice: body.cardPurcPrice != null ? String(body.cardPurcPrice) : null,
        soldDate,
        sellPrice: body.sellPrice != null ? String(body.sellPrice) : null,
        soldSource: toStr(body.soldSource),
        stateSold: toStr(body.stateSold),
        feeType: toStr(body.feeType),
        salesTax: computed.salesTax != null ? String(computed.salesTax) : null,
        totalCost: computed.totalCost != null ? String(computed.totalCost) : null,
        suggestedListPrice:
          computed.suggestedListPrice != null ? String(computed.suggestedListPrice) : null,
        sellPriceGoal:
          computed.sellPriceGoal != null ? String(computed.sellPriceGoal) : null,
        breakevenEbay:
          computed.breakevenEbay != null ? String(computed.breakevenEbay) : null,
        breakevenOther:
          computed.breakevenOther != null ? String(computed.breakevenOther) : null,
        status: computed.status,
        sellingFees:
          computed.sellingFees != null ? String(computed.sellingFees) : null,
        profitDollars:
          computed.profitDollars != null ? String(computed.profitDollars) : null,
        profitPct: computed.profitPct != null ? String(computed.profitPct) : null,
        metGoal: computed.metGoal,
        profitLoss: computed.profitLoss,
        notes: toStr(body.notes),
      })
      .returning();
    return NextResponse.json(inserted);
  } catch (e) {
    return handleApiError(e);
  }
}
