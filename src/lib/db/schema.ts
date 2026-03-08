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
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"), // "success" | "error"
  lastSyncCount: integer("last_sync_count"),
  lastSyncError: text("last_sync_error"),
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

// --- Collection Tracker (spreadsheet integration) ---

// User settings from StartHere (D9–D13): drive all collection calculations
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  salesTaxRate: decimal("sales_tax_rate", { precision: 6, scale: 4 }).default("0"), // e.g. 0.0725
  shippingUnder20: decimal("shipping_under_20", { precision: 8, scale: 2 }).default("0"),
  shippingOver20: decimal("shipping_over_20", { precision: 8, scale: 2 }).default("0"),
  sellingProfitGoal: decimal("selling_profit_goal", { precision: 6, scale: 4 }).default("0.2"), // e.g. 0.20
  inStockStatus: text("in_stock_status").default("Available"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Card transactions: one row per card (spreadsheet Card Transactions sheet)
export const cardTransactions = pgTable("card_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Inputs (A–R + Z, AA, AB, AC, AD)
  purcDate: timestamp("purc_date", { withTimezone: true }),
  purcSource: text("purc_source"),
  shippingCost: decimal("shipping_cost", { precision: 12, scale: 2 }).default("0"),
  qty: integer("qty"),
  year: text("year"),
  setName: text("set_name"),
  variation: text("variation"),
  cardType: text("card_type"),
  playerCharacter: text("player_character"),
  sport: text("sport"),
  team: text("team"),
  cardNotes: text("card_notes"),
  attributes: text("attributes"),
  numberedTo: text("numbered_to"),
  grade: text("grade"),
  gradingCompany: text("grading_company"),
  certNumber: text("cert_number"),
  cardPurcPrice: decimal("card_purc_price", { precision: 12, scale: 2 }),
  soldDate: timestamp("sold_date", { withTimezone: true }),
  sellPrice: decimal("sell_price", { precision: 12, scale: 2 }),
  soldSource: text("sold_source"),
  stateSold: text("state_sold"),
  feeType: text("fee_type"),
  // Computed (stored for querying; recalc on save)
  salesTax: decimal("sales_tax", { precision: 12, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }),
  suggestedListPrice: decimal("suggested_list_price", { precision: 12, scale: 2 }),
  sellPriceGoal: decimal("sell_price_goal", { precision: 12, scale: 2 }),
  breakevenEbay: decimal("breakeven_ebay", { precision: 12, scale: 2 }),
  breakevenOther: decimal("breakeven_other", { precision: 12, scale: 2 }),
  status: text("status"),
  sellingFees: decimal("selling_fees", { precision: 12, scale: 2 }),
  profitDollars: decimal("profit_dollars", { precision: 12, scale: 2 }),
  profitPct: decimal("profit_pct", { precision: 8, scale: 4 }),
  metGoal: text("met_goal"), // Yes | No
  profitLoss: text("profit_loss"), // Profit | Loss
  queriedSearch: text("queried_search"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Expenses (Expenses sheet: name, category, date, amount)
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expenseName: text("expense_name").notNull(),
  category: text("category").notNull(),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Reference data (dropdowns / lookups from Charts, Formulas & Drop-Downs + Sales Tax)
export const referenceData = pgTable(
  "reference_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = global seed
    type: text("type").notNull(), // sports, teams, expense_categories, state_tax_rates, etc.
    value: text("value").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(), // e.g. { state: "CA", rate: 0.0725 }
  },
  (t) => [unique().on(t.userId, t.type, t.value)]
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
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type CardTransaction = typeof cardTransactions.$inferSelect;
export type NewCardTransaction = typeof cardTransactions.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ReferenceDatum = typeof referenceData.$inferSelect;
export type NewReferenceDatum = typeof referenceData.$inferInsert;
