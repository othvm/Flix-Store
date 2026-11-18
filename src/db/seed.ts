import { getDb } from "./index";
import { categories, products, productVariants, storeSettings } from "./schema";
import { SEED_CATEGORIES, SEED_PRODUCTS, SEED_STORE_SETTINGS } from "./seed-data";

/**
 * Neon Postgres Database Seeding & Verification Script
 * Inserts all categories, products, variants, and settings idempotently.
 */
export async function seedDatabase() {
  console.log("=== STARTING FLIX STORE DATABASE SEED ===");
  const db = getDb();

  // 1. Seed Categories
  console.log(`[1/4] Seeding ${SEED_CATEGORIES.length} categories...`);
  for (const cat of SEED_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        id: cat.id,
        label: cat.label,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      })
      .onConflictDoUpdate({
        target: categories.id,
        set: {
          label: cat.label,
          sortOrder: cat.sortOrder,
          isActive: cat.isActive,
          updatedAt: new Date(),
        },
      });
  }

  // 2. Seed Products
  console.log(`[2/4] Seeding ${SEED_PRODUCTS.length} products...`);
  for (const prod of SEED_PRODUCTS) {
    await db
      .insert(products)
      .values({
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        categoryId: prod.categoryId,
        productType: prod.productType,
        service: prod.service,
        description: prod.description,
        platforms: prod.platforms,
        imageUrl: prod.imageUrl,
        accent: prod.accent,
        isActive: prod.isActive,
        isPopular: prod.isPopular,
        sortOrder: prod.sortOrder,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          name: prod.name,
          categoryId: prod.categoryId,
          productType: prod.productType,
          service: prod.service,
          description: prod.description,
          platforms: prod.platforms,
          imageUrl: prod.imageUrl,
          accent: prod.accent,
          isActive: prod.isActive,
          isPopular: prod.isPopular,
          sortOrder: prod.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 3. Seed Product Variants
  const allVariants = SEED_PRODUCTS.flatMap((p) =>
    p.variants.map((v) => ({ ...v, productId: p.id })),
  );
  console.log(`[3/4] Seeding ${allVariants.length} product variants...`);
  for (const variant of allVariants) {
    await db
      .insert(productVariants)
      .values({
        id: variant.id,
        productId: variant.productId,
        edition: variant.edition,
        duration: variant.duration,
        accountSlot: variant.accountSlot,
        denomination: variant.denomination,
        price: variant.price,
        isAvailable: variant.isAvailable,
        sortOrder: variant.sortOrder,
      })
      .onConflictDoUpdate({
        target: productVariants.id,
        set: {
          edition: variant.edition,
          duration: variant.duration,
          accountSlot: variant.accountSlot,
          denomination: variant.denomination,
          price: variant.price,
          isAvailable: variant.isAvailable,
          sortOrder: variant.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  // 4. Seed Store Settings
  console.log(`[4/4] Seeding ${SEED_STORE_SETTINGS.length} store settings...`);
  for (const setting of SEED_STORE_SETTINGS) {
    await db
      .insert(storeSettings)
      .values({
        key: setting.key,
        value: setting.value,
      })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: {
          value: setting.value,
          updatedAt: new Date(),
        },
      });
  }

  console.log("=== SEED COMPLETED SUCCESSFULLY ===");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => {
      console.log("Database seeded successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database seeding failed:", err);
      process.exit(1);
    });
}
