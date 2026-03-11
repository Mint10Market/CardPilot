/**
 * Raw show as returned by an external source (before normalization).
 */
export type RawShow = {
  externalId: string;
  name: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  timezone?: string | null;
  organizerName?: string | null;
  organizerEmail?: string | null;
  organizerPhone?: string | null;
  boothInfo?: string | null;
  buyerEntryCost?: string | null;
  vendorBoothCost?: string | null;
  vendorCount?: number | null;
  raw?: Record<string, unknown>;
};

export type ShowSourceAdapter = {
  name: string;
  fetch(): Promise<RawShow[]>;
};
