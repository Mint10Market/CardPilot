import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { db } from "@/lib/db";
import {
  cardTransactions,
  expenses,
  referenceData,
  userSettings,
} from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { parseCollectionXlsx, type ReferenceRow } from "@/lib/collection-import";
import { computeCardTransaction } from "@/lib/collection-calc";
import { handleApiError } from "@/lib/api-response";

const BATCH = 500;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());

    const parsed = parseCollectionXlsx(buffer);

    // Replace: delete user's transactions and expenses
    await db.delete(cardTransactions).where(eq(cardTransactions.userId, user.id));
    await db.delete(expenses).where(eq(expenses.userId, user.id));

    // Replace global state tax: delete existing state_tax_rates with userId null
    await db
      .delete(referenceData)
      .where(and(eq(referenceData.type, "state_tax_rates"), isNull(referenceData.userId)));

    // Ensure user has settings row (use defaults)
    await db
      .insert(userSettings)
      .values({ userId: user.id })
      .onConflictDoNothing();

    const settingsRows = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, user.id),
    });
    const settings = settingsRows
      ? {
          salesTaxRate: settingsRows.salesTaxRate ?? 0,
          shippingUnder20: settingsRows.shippingUnder20 ?? 0,
          shippingOver20: settingsRows.shippingOver20 ?? 0,
          sellingProfitGoal: settingsRows.sellingProfitGoal ?? 0.2,
          inStockStatus: settingsRows.inStockStatus ?? "Available",
        }
      : undefined;

    const stateTaxRates = new Map<string, number>();
    for (const r of parsed.reference) {
      if (r.type === "state_tax_rates" && r.meta && typeof r.meta.rate === "number") {
        stateTaxRates.set(r.value, r.meta.rate);
      }
    }

    let cardCount = 0;
    for (let i = 0; i < parsed.cardTransactions.length; i += BATCH) {
      const batch = parsed.cardTransactions.slice(i, i + BATCH);
      const values = batch.map((row) => {
        const computed = computeCardTransaction(
          {
            purcDate: row.purcDate,
            purcSource: row.purcSource,
            shippingCost: row.shippingCost,
            qty: row.qty,
            cardPurcPrice: row.cardPurcPrice,
            soldDate: row.soldDate,
            sellPrice: row.sellPrice,
            feeType: row.feeType,
            stateSold: row.stateSold,
          },
          settings,
          stateTaxRates
        );
        return {
          userId: user.id,
          purcDate: row.purcDate ? new Date(row.purcDate) : null,
          purcSource: row.purcSource,
          shippingCost: row.shippingCost,
          qty: row.qty,
          year: row.year,
          setName: row.setName,
          variation: row.variation,
          cardType: row.cardType,
          playerCharacter: row.playerCharacter,
          sport: row.sport,
          team: row.team,
          cardNotes: row.cardNotes,
          attributes: row.attributes,
          numberedTo: row.numberedTo,
          grade: row.grade,
          gradingCompany: row.gradingCompany,
          certNumber: row.certNumber,
          cardPurcPrice: row.cardPurcPrice,
          soldDate: row.soldDate ? new Date(row.soldDate) : null,
          sellPrice: row.sellPrice,
          soldSource: row.soldSource,
          stateSold: row.stateSold,
          feeType: row.feeType,
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
          notes: row.notes,
        };
      });
      await db.insert(cardTransactions).values(values);
      cardCount += values.length;
    }

    let expenseCount = 0;
    for (let i = 0; i < parsed.expenses.length; i += BATCH) {
      const batch = parsed.expenses.slice(i, i + BATCH);
      await db.insert(expenses).values(
        batch.map((row) => ({
          userId: user.id,
          expenseName: row.expenseName,
          category: row.category,
          expenseDate: new Date(row.expenseDate),
          amount: row.amount,
        }))
      );
      expenseCount += batch.length;
    }

    const refDedup = new Map<string, ReferenceRow>();
    for (const r of parsed.reference) {
      refDedup.set(`${r.type}:${r.value}`, r);
    }
    if (refDedup.size > 0) {
      await db.insert(referenceData).values(
        [...refDedup.values()].map((r) => ({
          userId: null,
          type: r.type,
          value: r.value,
          meta: r.meta ?? null,
        }))
      );
    }

    return NextResponse.json({
      ok: true,
      cardTransactions: cardCount,
      expenses: expenseCount,
      referenceUpdated: parsed.reference.length > 0,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
