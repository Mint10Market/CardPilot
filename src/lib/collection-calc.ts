/**
 * Collection Tracker calculations – matches spreadsheet logic (plan §0.2).
 * Used when saving/updating card transactions and when displaying computed fields.
 */

export interface UserSettingsForCalc {
  salesTaxRate: string | number;
  shippingUnder20: string | number;
  shippingOver20: string | number;
  sellingProfitGoal: string | number;
  inStockStatus: string;
}

const defaultSettings: UserSettingsForCalc = {
  salesTaxRate: 0,
  shippingUnder20: 0,
  shippingOver20: 0,
  sellingProfitGoal: 0.2,
  inStockStatus: "Available",
};

function n(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const x = typeof val === "string" ? parseFloat(val) : val;
  return Number.isFinite(x) ? x : 0;
}

/** Round to 2 decimal places (currency). Matches eBay fee rounding. */
function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CardTransactionInputs {
  purcDate?: string | Date | null;
  purcSource?: string | null;
  shippingCost?: string | number | null;
  qty?: number | null;
  cardPurcPrice?: string | number | null;
  soldDate?: string | Date | null;
  sellPrice?: string | number | null;
  feeType?: string | null;
  stateSold?: string | null;
}

export interface CardTransactionComputed {
  salesTax: number | null;
  totalCost: number | null;
  status: string | null;
  sellPriceGoal: number | null;
  suggestedListPrice: number | null;
  breakevenEbay: number | null;
  breakevenOther: number | null;
  sellingFees: number | null;
  profitDollars: number | null;
  profitPct: number | null;
  metGoal: string | null;
  profitLoss: string | null;
}

/**
 * Get state tax rate for selling fees (from Sales Tax sheet). Default 0.05 if unknown.
 */
export function getStateTaxRate(stateSold: string | null | undefined, stateTaxRates: Map<string, number>): number {
  if (!stateSold?.trim()) return 0.05;
  const rate = stateTaxRates.get(stateSold.trim());
  return rate !== undefined ? rate : 0.05;
}

/**
 * Compute all derived fields for one card transaction.
 */
export function computeCardTransaction(
  row: CardTransactionInputs,
  settings: Partial<UserSettingsForCalc> = {},
  stateTaxRates: Map<string, number> = new Map()
): CardTransactionComputed {
  void stateTaxRates; // reserved for buyer-state sales tax when row includes ship-to state
  const s = { ...defaultSettings, ...settings };
  const taxRate = n(s.salesTaxRate);
  const shipUnder20 = n(s.shippingUnder20);
  const shipOver20 = n(s.shippingOver20);
  const profitGoal = n(s.sellingProfitGoal);
  const inStock = s.inStockStatus ?? "Available";

  const hasPurcDate = row.purcDate != null && String(row.purcDate).trim() !== "";
  const shipping = n(row.shippingCost);
  const cardPrice = n(row.cardPurcPrice);
  const qty = row.qty;
  const hasQty = qty != null && qty !== 0;
  const sellPrice = n(row.sellPrice);
  const hasSoldDate = row.soldDate != null && String(row.soldDate).trim() !== "";
  const isSold = hasQty && hasSoldDate && sellPrice > 0;
  const purcSource = (row.purcSource ?? "").trim();
  const ebaySources = ["eBay", "ebay"];
  const taxSources = ["Card Shop", "COMC", "Auction House", "Whatnot"];

  // Sales Tax
  let salesTax: number;
  if (!hasPurcDate) {
    salesTax = 0;
  } else if (ebaySources.includes(purcSource)) {
    salesTax = (shipping + cardPrice) * taxRate;
  } else if (taxSources.some((src) => purcSource.toLowerCase().includes(src.toLowerCase()))) {
    salesTax = cardPrice * taxRate;
  } else {
    salesTax = 0;
  }

  // Status
  let status: string | null;
  if (!hasQty) status = null;
  else if (!hasSoldDate || sellPrice <= 0) status = inStock;
  else status = "Sold";

  // Total Cost (blank if status would be blank)
  const totalCostVal = status === null ? null : shipping + cardPrice + salesTax;

  // Sell Price Goal (only when not sold)
  const sellPriceGoalVal =
    status !== "Sold" && totalCostVal != null && totalCostVal > 0 && profitGoal < 1
      ? totalCostVal / (1 - profitGoal)
      : null;

  // Suggested List Price: CEILING(goal, 5) - 0.01
  const suggestedListPriceVal =
    sellPriceGoalVal != null ? Math.ceil(sellPriceGoalVal / 5) * 5 - 0.01 : null;

  // Breakevens (only when not sold)
  const breakevenEbayVal =
    status !== "Sold" && totalCostVal != null && totalCostVal > 0
      ? totalCostVal / 0.87 + 0.3
      : null;
  const breakevenOtherVal =
    status !== "Sold" && totalCostVal != null && totalCostVal > 0
      ? totalCostVal / 0.971 + 0.3
      : null;

  // Selling Fees (when sell price present) — exact eBay math, no estimations.
  // Fee base = order total (item + shipping). Each component rounded to 2 decimals then summed.
  let sellingFees: number | null = null;
  if (sellPrice > 0) {
    const shipCharge = sellPrice >= 20 ? shipOver20 : shipUnder20;
    const feeBase = roundTo2(sellPrice + shipCharge);

    const finalValueRate = 0.1235;
    const topRatedSellerDiscountRate = 0.1;
    const fvfFixedPerOrder = 0.3;
    const promotedListingRate = 0.05;

    const fvfGross = roundTo2(feeBase * finalValueRate);
    const trsDiscount = roundTo2(fvfGross * topRatedSellerDiscountRate);
    const fvfNet = roundTo2(fvfGross - trsDiscount);
    const transactionFees = roundTo2(fvfNet + fvfFixedPerOrder);

    const adFee = roundTo2(feeBase * promotedListingRate);
    const ebayPart = roundTo2(transactionFees + adFee);

    const gsPart =
      isSold && (row.feeType ?? "").toLowerCase().includes("g&s")
        ? roundTo2(roundTo2(0.029 * sellPrice) + 0.3)
        : 0;
    sellingFees = roundTo2(ebayPart + gsPart);
  }

  // Profit $ and %
  let profitDollars: number | null = null;
  let profitPct: number | null = null;
  let metGoal: string | null = null;
  let profitLoss: string | null = null;
  if (isSold && totalCostVal != null && sellingFees != null) {
    profitDollars = sellPrice - sellingFees - totalCostVal;
    const denominator = totalCostVal + sellingFees;
    profitPct = denominator > 0 ? (sellPrice - denominator) / denominator : null;
    metGoal = profitPct != null && profitPct >= profitGoal ? "Yes" : "No";
    profitLoss = profitDollars > 0 ? "Profit" : "Loss";
  }

  return {
    salesTax: hasPurcDate ? salesTax : null,
    totalCost: totalCostVal,
    status,
    sellPriceGoal: sellPriceGoalVal,
    suggestedListPrice: suggestedListPriceVal,
    breakevenEbay: breakevenEbayVal,
    breakevenOther: breakevenOtherVal,
    sellingFees,
    profitDollars,
    profitPct,
    metGoal,
    profitLoss,
  };
}

/** Expense categories used in Summary & Income (plan §0.3). */
export const EXPENSE_CATEGORIES = [
  "Office Supplies/Equipment",
  "Shipping/Fulfillment",
  "Card Supplies",
  "Promoted Listing/Insertion/Subtitle Fees",
  "Grading/Authentication",
  "Marketing/Advertising",
  "Memberships/Subscriptions",
  "Insurance",
  "Storage/Facilities",
  "Taxes",
  "Donations",
  "Events/Shows/Travel",
  "Losses/Adjustments",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
