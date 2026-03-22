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

/**
 * eBay fee estimation (matches eBay “Transaction fees” as shown in the order breakdown UI).
 *
 * Assumptions based on the fulfillment payload we store:
 * - `orderTotal` already includes shipping charged to the buyer (and may include buyer sales tax)
 * - Estimated FVF uses `(orderTotal - salesTax)` when `salesTax` is provided
 * - We model: (FVF after TRS discount) + fixed per-order transaction fee
 * - We do not add a separate promoted-listing ad fee here (it would overstate vs the UI)
 */
const FVF_RATE = 0.1235;
const TRS_DISCOUNT_RATE = 0.1;
const FVF_FIXED_PER_ORDER = 0.3;

/**
 * Estimate eBay seller fees when API data is missing.
 *
 * Uses a fee base of `orderTotal - salesTax` when `salesTax` is known (buyer tax is remitted;
 * FVF is not assessed on that portion). Falls back to full `orderTotal` when tax is 0/unknown.
 */
export function getOrderFeesEstimate(
  orderTotal: number,
  shippingChargedToBuyer: number = 0,
  salesTax: number = 0
): number {
  if (orderTotal <= 0) return 0;
  void shippingChargedToBuyer; // kept for signature compatibility
  const feeBase = roundTo2(Math.max(0, orderTotal - salesTax));
  if (feeBase <= 0) return 0;
  const fvfGross = roundTo2(feeBase * FVF_RATE);
  const trsDiscount = roundTo2(fvfGross * TRS_DISCOUNT_RATE);
  const fvfNet = roundTo2(fvfGross - trsDiscount);
  const transactionFees = roundTo2(fvfNet + FVF_FIXED_PER_ORDER);
  return roundTo2(transactionFees);
}

export interface OrderDeductionInputs {
  orderTotal: number;
  fees: string | number | null | undefined;
  shippingCost: string | number | null | undefined;
  /** Buyer sales tax included in `orderTotal` (from fulfillment `pricingSummary.tax`); deducted as pass-through. */
  salesTax?: string | number | null | undefined;
  costOfCard?: string | number | null | undefined;
  /** When true, use getOrderFeesEstimate when fees are missing (for eBay orders). */
  useFeeEstimate?: boolean;
  /** Kept for backward compatibility; not needed with our current fee-base assumption. */
  shippingChargedToBuyer?: number;
}

export interface OrderDeductionResult {
  revenue: number;
  fees: number;
  feesIsEstimated: boolean;
  shippingCost: number;
  salesTax: number;
  costOfCard: number;
  totalDeductions: number;
  net: number;
}

/**
 * Compute deductions and net for one order. Uses stored fees when present; otherwise optional estimate.
 */
export function computeOrderDeductions(input: OrderDeductionInputs): OrderDeductionResult {
  const revenue = roundTo2(input.orderTotal);
  const salesTax = roundTo2(n(input.salesTax));
  const storedFees = n(input.fees);
  const useEstimate = Boolean(input.useFeeEstimate && storedFees === 0 && input.orderTotal > 0);
  const fees = useEstimate
    ? getOrderFeesEstimate(input.orderTotal, input.shippingChargedToBuyer ?? 0, salesTax)
    : roundTo2(storedFees);
  const feesIsEstimated = useEstimate;
  const shippingCost = roundTo2(n(input.shippingCost));
  const costOfCard = roundTo2(n(input.costOfCard));
  const totalDeductions = roundTo2(fees + shippingCost + salesTax + costOfCard);
  const net = roundTo2(revenue - totalDeductions);
  return {
    revenue,
    fees,
    feesIsEstimated,
    shippingCost,
    salesTax,
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
  /** For eBay: use estimate when fees missing. */
  shippingChargedToBuyer?: number;
}

export interface PeriodTotals {
  totalRevenue: number;
  totalFees: number;
  totalShippingCost: number;
  totalSalesTax: number;
  totalCostOfCard: number;
  totalDeductions: number;
  totalNet: number;
}

/**
 * Compute period-level totals from arrays of orders and manual sales.
 * eBay rows: use computeOrderDeductions with useFeeEstimate true when fees missing.
 */
type RawPayloadForFees =
  | {
      pricingSummary?: {
        deliveryCost?: { value?: string };
        tax?: { value?: string };
      };
      // line items contain the "shipping label" cost components
      lineItems?: Array<{
        deliveryCost?: {
          shippingCost?: { value?: string };
          handlingCost?: { value?: string };
        };
      }>;
    }
  | null
  | undefined;

function getShippingLabelCostFromRawPayload(raw: unknown): number {
  const r = raw as RawPayloadForFees;
  const items = Array.isArray(r?.lineItems) ? r!.lineItems : [];
  let sum = 0;
  for (const li of items) {
    const ship = li?.deliveryCost?.shippingCost?.value;
    sum += n(ship);
  }
  return roundTo2(sum);
}

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
  let totalSalesTax = 0;
  let totalCostOfCard = 0;

  for (const o of ebayOrders) {
    const amt = n(o.totalAmount);
    const raw = o.rawPayload as RawPayloadForFees;
    const shipToBuyer = n(raw?.pricingSummary?.deliveryCost?.value);
    const buyerSalesTax = n(raw?.pricingSummary?.tax?.value);
    const shippingLabelCost = getShippingLabelCostFromRawPayload(raw);
    const hasLineItems = Array.isArray(raw?.lineItems);
    const calc = computeOrderDeductions({
      orderTotal: amt,
      fees: o.fees,
      // Prefer raw payload "shipping label" value (excludes handling).
      shippingCost: hasLineItems ? shippingLabelCost : o.shippingCost,
      salesTax: buyerSalesTax,
      costOfCard: o.costOfCard,
      useFeeEstimate: true,
      shippingChargedToBuyer: shipToBuyer,
    });
    totalRevenue += calc.revenue;
    totalFees += calc.fees;
    totalShippingCost += calc.shippingCost;
    totalSalesTax += calc.salesTax;
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
  totalSalesTax = roundTo2(totalSalesTax);
  totalCostOfCard = roundTo2(totalCostOfCard);
  const totalDeductions = roundTo2(totalFees + totalShippingCost + totalSalesTax + totalCostOfCard);
  const totalNet = roundTo2(totalRevenue - totalDeductions);

  return {
    totalRevenue,
    totalFees,
    totalShippingCost,
    totalSalesTax,
    totalCostOfCard,
    totalDeductions,
    totalNet,
  };
}
