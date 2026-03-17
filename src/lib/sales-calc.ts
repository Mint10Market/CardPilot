/**
 * Sales & Profit – single source of truth for order-level and period-level math.
 * All deduction and net calculations go through this module so modal, table, and summary stay consistent.
 */

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function n(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "") return 0;
  const x = typeof val === "string" ? parseFloat(val) : val;
  return Number.isFinite(x) ? x : 0;
}

/** eBay fee estimation (matches collection-calc logic): FVF + promoted listing, no G&S. */
const FVF_RATE = 0.1235;
const TRS_DISCOUNT_RATE = 0.1;
const FVF_FIXED_PER_ORDER = 0.3;
const PROMOTED_LISTING_RATE = 0.05;

/**
 * Estimate eBay seller fees when API data is missing. Uses order total + shipping charged to buyer as fee base.
 */
export function getOrderFeesEstimate(
  orderTotal: number,
  shippingChargedToBuyer: number = 0
): number {
  if (orderTotal <= 0) return 0;
  const feeBase = roundTo2(orderTotal + shippingChargedToBuyer);
  const fvfGross = roundTo2(feeBase * FVF_RATE);
  const trsDiscount = roundTo2(fvfGross * TRS_DISCOUNT_RATE);
  const fvfNet = roundTo2(fvfGross - trsDiscount);
  const transactionFees = roundTo2(fvfNet + FVF_FIXED_PER_ORDER);
  const adFee = roundTo2(feeBase * PROMOTED_LISTING_RATE);
  return roundTo2(transactionFees + adFee);
}

export interface OrderDeductionInputs {
  orderTotal: number;
  fees: string | number | null | undefined;
  shippingCost: string | number | null | undefined;
  costOfCard?: string | number | null | undefined;
  /** When true, use getOrderFeesEstimate when fees are missing (for eBay orders). */
  useFeeEstimate?: boolean;
  /** Shipping charged to buyer (for fee estimate base). */
  shippingChargedToBuyer?: number;
}

export interface OrderDeductionResult {
  revenue: number;
  fees: number;
  feesIsEstimated: boolean;
  shippingCost: number;
  costOfCard: number;
  totalDeductions: number;
  net: number;
}

/**
 * Compute deductions and net for one order. Uses stored fees when present; otherwise optional estimate.
 */
export function computeOrderDeductions(input: OrderDeductionInputs): OrderDeductionResult {
  const revenue = roundTo2(input.orderTotal);
  const storedFees = n(input.fees);
  const useEstimate = Boolean(input.useFeeEstimate && storedFees === 0 && input.orderTotal > 0);
  const fees = useEstimate
    ? getOrderFeesEstimate(input.orderTotal, input.shippingChargedToBuyer ?? 0)
    : roundTo2(storedFees);
  const feesIsEstimated = useEstimate;
  const shippingCost = roundTo2(n(input.shippingCost));
  const costOfCard = roundTo2(n(input.costOfCard));
  const totalDeductions = roundTo2(fees + shippingCost + costOfCard);
  const net = roundTo2(revenue - totalDeductions);
  return {
    revenue,
    fees,
    feesIsEstimated,
    shippingCost,
    costOfCard,
    totalDeductions,
    net,
  };
}

export interface OrderRowForCalc {
  type: "eBay" | "Manual";
  amount: number;
  fees?: string | number | null;
  shippingCost?: string | number | null;
  costOfCard?: string | number | null;
  /** For eBay: use estimate when fees missing; and shipping charged to buyer for fee base. */
  shippingChargedToBuyer?: number;
}

export interface PeriodTotals {
  totalRevenue: number;
  totalFees: number;
  totalShippingCost: number;
  totalCostOfCard: number;
  totalDeductions: number;
  totalNet: number;
}

/**
 * Compute period-level totals from arrays of orders and manual sales.
 * eBay rows: use computeOrderDeductions with useFeeEstimate true when fees missing.
 */
type RawPayloadForFees = { pricingSummary?: { deliveryCost?: { value?: string } } } | null | undefined;

export function computePeriodTotals(
  ebayOrders: Array<{
    totalAmount?: string | number | null;
    fees?: string | null;
    shippingCost?: string | null;
    costOfCard?: string | null;
    rawPayload?: RawPayloadForFees | unknown;
  }>,
  manualSales: Array<{ amount?: string | number | null }>
): PeriodTotals {
  let totalRevenue = 0;
  let totalFees = 0;
  let totalShippingCost = 0;
  let totalCostOfCard = 0;

  for (const o of ebayOrders) {
    const amt = n(o.totalAmount);
    const raw = o.rawPayload as RawPayloadForFees;
    const shipToBuyer = n(raw?.pricingSummary?.deliveryCost?.value);
    const calc = computeOrderDeductions({
      orderTotal: amt,
      fees: o.fees,
      shippingCost: o.shippingCost,
      costOfCard: o.costOfCard,
      useFeeEstimate: true,
      shippingChargedToBuyer: shipToBuyer,
    });
    totalRevenue += calc.revenue;
    totalFees += calc.fees;
    totalShippingCost += calc.shippingCost;
    totalCostOfCard += calc.costOfCard;
  }

  for (const m of manualSales) {
    const amt = n(m.amount);
    totalRevenue += amt;
    // Manual sales: no eBay fees or shipping cost in schema for now
  }

  totalRevenue = roundTo2(totalRevenue);
  totalFees = roundTo2(totalFees);
  totalShippingCost = roundTo2(totalShippingCost);
  totalCostOfCard = roundTo2(totalCostOfCard);
  const totalDeductions = roundTo2(totalFees + totalShippingCost + totalCostOfCard);
  const totalNet = roundTo2(totalRevenue - totalDeductions);

  return {
    totalRevenue,
    totalFees,
    totalShippingCost,
    totalCostOfCard,
    totalDeductions,
    totalNet,
  };
}
