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
 * eBay transaction fee estimation (Final Value Fee + fixed per order), separate from ad/promoted fees.
 *
 * Matches Seller Hub “Transaction details” style math (Sports Mem / Cards example):
 * - Variable % (e.g. 12.35%) on eBay’s **“Fees based on”** amount (item + shipping + buyer sales tax).
 * - **Top Rated Seller** discount: 10% off the **variable** FVF portion only.
 * - **Fixed per-order** fee: **$0.40** when fees-based-on total is **≥ $10.01**, else **$0.30**.
 *
 * Fee base: prefer `priceSubtotal + deliveryCost + tax` from fulfillment `pricingSummary` when present
 * (matches “Fees based on”); otherwise `orderTotal`.
 */
const FVF_RATE = 0.1235;
const TRS_DISCOUNT_RATE = 0.1;
/** Per-order fixed transaction fee when “fees based on” is under $10.01 */
const FVF_FIXED_UNDER_10_01 = 0.3;
/** Per-order fixed fee for order totals $10.01+ (eBay Seller Hub line item) */
const FVF_FIXED_FROM_10_01 = 0.4;
/** Estimated promoted listing / ad fee rate on the same base as FVF “fees based on” (tunable). */
const PROMOTED_LISTING_RATE = 0.05;

function fvfFixedPerOrder(feesBasedOn: number): number {
  return feesBasedOn >= 10.01 ? FVF_FIXED_FROM_10_01 : FVF_FIXED_UNDER_10_01;
}

/**
 * eBay “Fees based on” for FVF % — subtotal + shipping to buyer + tax when the payload breaks them out.
 */
export function getEbayFvfFeeBase(orderTotal: number, rawPayload?: unknown): number {
  const r = rawPayload as
    | {
        pricingSummary?: {
          priceSubtotal?: { value?: string };
          deliveryCost?: { value?: string };
          tax?: { value?: string };
        };
      }
    | null
    | undefined;
  const sub = n(r?.pricingSummary?.priceSubtotal?.value);
  const del = n(r?.pricingSummary?.deliveryCost?.value);
  const tax = n(r?.pricingSummary?.tax?.value);
  const summed = roundTo2(sub + del + tax);
  if (summed > 0.005) return summed;
  return roundTo2(Math.max(0, orderTotal));
}

/**
 * Final Value Fee-style transaction fees only (no promoted listing), from eBay’s fees-based-on amount.
 */
export function estimateEbayTransactionFeesFromFeeBase(feesBasedOn: number): number {
  if (feesBasedOn <= 0) return 0;
  const base = roundTo2(feesBasedOn);
  const fvfGross = roundTo2(base * FVF_RATE);
  const trsDiscount = roundTo2(fvfGross * TRS_DISCOUNT_RATE);
  const fvfNet = roundTo2(fvfGross - trsDiscount);
  const fixed = fvfFixedPerOrder(base);
  return roundTo2(fvfNet + fixed);
}

/**
 * Estimate eBay **transaction** (FVF) fees when API data is missing.
 *
 * @param rawPayload — optional fulfillment order JSON; used to compute “Fees based on” like Seller Hub.
 */
export function getOrderFeesEstimate(
  orderTotal: number,
  shippingChargedToBuyer: number = 0,
  salesTax: number = 0,
  rawPayload?: unknown
): number {
  void shippingChargedToBuyer;
  void salesTax;
  const feeBase = getEbayFvfFeeBase(orderTotal, rawPayload);
  return estimateEbayTransactionFeesFromFeeBase(feeBase);
}

/**
 * Estimate promoted-listing / ad fees on the same “fees based on” base as FVF.
 */
export function getOrderAdFeesEstimate(
  orderTotal: number,
  salesTax: number = 0,
  rawPayload?: unknown
): number {
  void salesTax;
  const feeBase = getEbayFvfFeeBase(orderTotal, rawPayload);
  if (feeBase <= 0) return 0;
  return roundTo2(feeBase * PROMOTED_LISTING_RATE);
}

export interface OrderDeductionInputs {
  orderTotal: number;
  fees: string | number | null | undefined;
  shippingCost: string | number | null | undefined;
  /** Buyer sales tax included in `orderTotal` (from fulfillment `pricingSummary.tax`); deducted as pass-through. */
  salesTax?: string | number | null | undefined;
  /** Optional known ad / promoted-listing fee for the order (when you have it from statements). */
  adFees?: string | number | null | undefined;
  costOfCard?: string | number | null | undefined;
  /** When true, use getOrderFeesEstimate when fees are missing (for eBay orders). */
  useFeeEstimate?: boolean;
  /**
   * When true (default), include ad/promoted-listing fees: uses `adFees` if set, else `getOrderAdFeesEstimate`.
   * Set false if you do not use promoted listings and want to skip the estimate.
   */
  useAdFeeEstimate?: boolean;
  /** Kept for backward compatibility; not needed with our current fee-base assumption. */
  shippingChargedToBuyer?: number;
  /** Fulfillment order JSON — used to derive eBay “Fees based on” (subtotal + shipping + tax). */
  rawPayload?: unknown;
}

export interface OrderDeductionResult {
  revenue: number;
  /** eBay transaction fees (FVF-style), not including ad fees. */
  fees: number;
  feesIsEstimated: boolean;
  /** Promoted listing / ad fees (estimated unless `adFees` input provided). */
  adFees: number;
  adFeesIsEstimated: boolean;
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
    ? getOrderFeesEstimate(
        input.orderTotal,
        input.shippingChargedToBuyer ?? 0,
        salesTax,
        input.rawPayload
      )
    : roundTo2(storedFees);
  const feesIsEstimated = useEstimate;
  const includeAdFees = input.useAdFeeEstimate !== false;
  const storedAdFees = roundTo2(n(input.adFees));
  const adFromModel = getOrderAdFeesEstimate(input.orderTotal, salesTax, input.rawPayload);
  const adFees = includeAdFees ? (storedAdFees > 0 ? storedAdFees : adFromModel) : storedAdFees;
  const adFeesIsEstimated = includeAdFees && storedAdFees === 0 && adFromModel > 0;
  const shippingCost = roundTo2(n(input.shippingCost));
  const costOfCard = roundTo2(n(input.costOfCard));
  const totalDeductions = roundTo2(fees + adFees + shippingCost + salesTax + costOfCard);
  const net = roundTo2(revenue - totalDeductions);
  return {
    revenue,
    fees,
    feesIsEstimated,
    adFees,
    adFeesIsEstimated,
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
  totalAdFees: number;
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
        priceSubtotal?: { value?: string };
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
  let totalAdFees = 0;
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
      rawPayload: raw,
    });
    totalRevenue += calc.revenue;
    totalFees += calc.fees;
    totalAdFees += calc.adFees;
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
  totalAdFees = roundTo2(totalAdFees);
  totalShippingCost = roundTo2(totalShippingCost);
  totalSalesTax = roundTo2(totalSalesTax);
  totalCostOfCard = roundTo2(totalCostOfCard);
  const totalDeductions = roundTo2(
    totalFees + totalAdFees + totalShippingCost + totalSalesTax + totalCostOfCard
  );
  const totalNet = roundTo2(totalRevenue - totalDeductions);

  return {
    totalRevenue,
    totalFees,
    totalAdFees,
    totalShippingCost,
    totalSalesTax,
    totalCostOfCard,
    totalDeductions,
    totalNet,
  };
}
