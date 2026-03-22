/**
 * Deep link to manage an eBay listing (seller must be logged in).
 * eBay URLs change occasionally; override with NEXT_PUBLIC_EBAY_LISTING_EDIT_URL_TEMPLATE
 * using literal `{listingId}` placeholder (listing id is inserted URL-encoded).
 */
export function ebayListingManageUrl(listingId: string): string {
  const template = process.env.NEXT_PUBLIC_EBAY_LISTING_EDIT_URL_TEMPLATE;
  if (template?.includes("{listingId}")) {
    return template.replaceAll("{listingId}", encodeURIComponent(listingId));
  }
  // Default: live listing page — seller UI typically offers "Revise" when signed in as owner.
  return `https://www.ebay.com/itm/${encodeURIComponent(listingId)}`;
}
