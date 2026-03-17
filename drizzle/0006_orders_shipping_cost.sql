-- Add seller shipping cost to orders for profit calculation (eBay lineItems.deliveryCost.shippingCost).
ALTER TABLE "orders" ADD COLUMN "shipping_cost" numeric(12, 2);
