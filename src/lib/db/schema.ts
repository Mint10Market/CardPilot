import {
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
  integer,
  jsonb,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

// Users keyed by eBay identity (no separate app sign-in)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  ebayUserId: text("ebay_user_id").notNull().unique(),
  ebayUsername: text("ebay_username"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(), // encrypt at application layer
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Orders (eBay + will link manual sales separately)
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ebayOrderId: text("ebay_order_id").unique(),
  orderDate: timestamp("order_date", { withTimezone: true }).notNull(),
  buyerUsername: text("buyer_username"),
  buyerUserId: text("buyer_user_id"),
  status: text("status").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  fees: decimal("fees", { precision: 12, scale: 2 }),
  lineItems: jsonb("line_items").$type<Array<{ sku?: string; title: string; quantity: number; price: string }>>().notNull(),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Customers (from eBay buyers + manual for in-person)
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  identifier: text("identifier").notNull(), // eBay username or manual id
  displayName: text("display_name"),
  email: text("email"),
  source: text("source").notNull(), // 'ebay' | 'manual'
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ userIdentifier: unique().on(t.userId, t.identifier) }));

// Inventory (eBay-sourced + manual)
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sku: text("sku"),
  ebayOfferId: text("ebay_offer_id").unique(),
  title: text("title").notNull(),
  quantity: integer("quantity").notNull().default(0),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  condition: text("condition"),
  category: text("category"),
  source: text("source").notNull(), // 'ebay' | 'manual'
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Manual sales (card shows / in-person)
export const manualSales = pgTable("manual_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  saleDate: timestamp("sale_date", { withTimezone: true }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  lineItems: jsonb("line_items").$type<Array<{ title: string; quantity: number; price: string; inventoryItemId?: string }>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Card shows (global, multi-source aggregated)
export const cardShows = pgTable("card_shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  venue: text("venue"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("US"),
  timezone: text("timezone"),
  organizerName: text("organizer_name"),
  organizerEmail: text("organizer_email"),
  organizerPhone: text("organizer_phone"),
  boothInfo: text("booth_info"), // how to buy, price, link
  vendorCount: integer("vendor_count"),
  credibilityScore: integer("credibility_score"), // e.g. number of sources
  hotColdRating: text("hot_cold_rating"), // 'cold' | 'warm' | 'hot' or 1-5
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Which sources contributed to each show (for dedupe + attribution)
export const showSources = pgTable(
  "show_sources",
  {
    showId: uuid("show_id")
      .notNull()
      .references(() => cardShows.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    externalId: text("external_id").notNull(),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.showId, t.sourceName, t.externalId] })]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type ManualSale = typeof manualSales.$inferSelect;
export type NewManualSale = typeof manualSales.$inferInsert;
export type CardShow = typeof cardShows.$inferSelect;
export type NewCardShow = typeof cardShows.$inferInsert;
export type ShowSource = typeof showSources.$inferSelect;
export type NewShowSource = typeof showSources.$inferInsert;
