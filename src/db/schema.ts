import { pgTable, text, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

/**
 * 1. Categories
 * Stores high-level product groupings (playstation, streaming, music, games, apple).
 */
export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // 'playstation', 'streaming', 'music', 'games', 'apple'
  label: text("label").notNull(), // 'بلايستيشن', 'ستريمينج', etc.
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 2. Products
 * Primary catalog entity representing games, subscriptions, or gift cards.
 */
export const products = pgTable("products", {
  id: text("id").primaryKey(), // Unique slug, e.g. 'gta6', 'ps-plus', 'netflix'
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(), // 'ps_plus' | 'game' | 'subscription' | 'gift_card'
  service: text("service"), // 'PlayStation', 'Netflix', 'PUBG Mobile', etc.
  description: text("description"),
  platforms: jsonb("platforms").$type<string[]>().notNull().default([]), // ['PS4', 'PS5']
  imageUrl: text("image_url"), // URL from Vercel Blob or local poster asset
  accent: text("accent").notNull().default("from-red-700 via-zinc-900 to-black"),
  isActive: boolean("is_active").notNull().default(true), // Visibility on storefront
  isPopular: boolean("is_popular").notNull().default(false), // Featured / Popular badge
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 3. Product Variants
 * Holds specific pricing variations, editions, slots, durations, or denominations.
 */
export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey(), // Deterministic ID or UUID
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  edition: text("edition"), // 'Standard Edition', 'Ultimate Edition', 'Essential', 'Extra'
  duration: text("duration"), // 'شهر', '3 شهور', 'سنة', 'فوري'
  accountSlot: text("account_slot"), // 'prim5', 'prim4', 'sec'
  denomination: text("denomination"), // '10 $', '20 $', '100 $'
  price: integer("price").notNull(), // Price in Egyptian Pounds (EGP)
  isAvailable: boolean("is_available").notNull().default(true), // Stock toggle
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 4. Offers
 * Promotional banners and special deals displayed on the storefront.
 */
export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  badge: text("badge"), // e.g. "خصم 30%", "الأكثر مبيعاً"
  discountPrice: integer("discount_price"),
  originalPrice: integer("original_price"),
  imageUrl: text("image_url"),
  accent: text("accent"),
  isActive: boolean("is_active").notNull().default(true),
  validUntil: timestamp("valid_until"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 5. Store Settings
 * Dynamic operational settings (WhatsApp numbers, payment details, announcements).
 */
export const storeSettings = pgTable("store_settings", {
  key: text("key").primaryKey(), // 'contact_info', 'payment_accounts', 'announcement'
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * 6. Admin Sessions
 * Server-side session tracking ensuring logout invalidates the session in database.
 */
export const adminSessions = pgTable("admin_sessions", {
  id: text("id").primaryKey(), // Session token UUID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isValid: boolean("is_valid").notNull().default(true), // Set false on logout
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});

/**
 * 7. Admin Login Attempts
 * Sliding-window brute force protection table.
 */
export const adminLoginAttempts = pgTable("admin_login_attempts", {
  ip: text("ip").primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(1),
  lockedUntil: timestamp("locked_until"),
  lastAttempt: timestamp("last_attempt").notNull().defaultNow(),
});

/**
 * 8. User Profiles
 * Customer and admin profile records linked to auth.users.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role").notNull().default("customer"), // 'admin' | 'customer'
  email: text("email"),
  fullName: text("full_name"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 9. Orders
 * Digital storefront order records.
 */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // 'FL-xxxxxx'
  customerId: uuid("customer_id").references(() => profiles.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  productName: text("product_name").notNull(),
  productType: text("product_type"),
  edition: text("edition"),
  duration: text("duration"),
  accountSlot: text("account_slot"),
  platform: text("platform"),
  price: integer("price").notNull(),
  paymentMethod: text("payment_method").notNull(), // 'vodafone' | 'instapay' | 'telda'
  receiptUrl: text("receipt_url"),
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type StoreSetting = typeof storeSettings.$inferSelect;
export type AdminSession = typeof adminSessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Order = typeof orders.$inferSelect;
