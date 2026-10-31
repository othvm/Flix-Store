import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";
import {
  authenticateAdmin,
  getAdminSession,
  assertAdminSession,
  logoutAdmin,
} from "../auth.server";
import { uploadCatalogImage, safeDeleteOldImage } from "../storage.server";
import { getDb } from "@/db";
import {
  categories,
  products,
  productVariants,
  offers,
  storeSettings,
} from "@/db/schema";
import { count, eq, and, sql, desc, asc } from "drizzle-orm";

/* =========================================================================
   1. AUTHENTICATION SERVER FUNCTIONS
   ========================================================================= */

export const loginAdminFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      code: z.string().min(1, "رمز الدخول مطلوب"),
    }),
  )
  .handler(async ({ data }) => {
    return await authenticateAdmin(data.code);
  });

export const checkAdminAuthFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getAdminSession();
    return {
      authenticated: Boolean(session),
      expiresAt: session?.expiresAt ? session.expiresAt.toISOString() : null,
    };
  },
);

export const logoutAdminFn = createServerFn({ method: "POST" }).handler(
  async () => {
    return await logoutAdmin();
  },
);

/* =========================================================================
   2. DASHBOARD OVERVIEW METRICS
   ========================================================================= */

export const getAdminOverviewFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAdminSession();
    const db = getDb();

    const [catCount] = await db.select({ total: count() }).from(categories);
    const [prodCount] = await db.select({ total: count() }).from(products);
    const [activeProdCount] = await db
      .select({ total: count() })
      .from(products)
      .where(eq(products.isActive, true));
    const [variantCount] = await db
      .select({ total: count() })
      .from(productVariants);
    const [activeVariantCount] = await db
      .select({ total: count() })
      .from(productVariants)
      .where(eq(productVariants.isAvailable, true));
    const [offerCount] = await db.select({ total: count() }).from(offers);
    const [activeOfferCount] = await db
      .select({ total: count() })
      .from(offers)
      .where(eq(offers.isActive, true));

    // Category distribution
    const categoryDistribution = await db
      .select({
        categoryId: products.categoryId,
        categoryLabel: categories.label,
        productCount: count(products.id),
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .groupBy(products.categoryId, categories.label);

    // Recent products
    const recentProducts = await db
      .select({
        id: products.id,
        name: products.name,
        category: categories.label,
        isActive: products.isActive,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.updatedAt))
      .limit(6);

    return {
      totalCategories: catCount?.total ?? 0,
      totalProducts: prodCount?.total ?? 0,
      activeProducts: activeProdCount?.total ?? 0,
      inactiveProducts: (prodCount?.total ?? 0) - (activeProdCount?.total ?? 0),
      totalVariants: variantCount?.total ?? 0,
      activeVariants: activeVariantCount?.total ?? 0,
      unavailableVariants:
        (variantCount?.total ?? 0) - (activeVariantCount?.total ?? 0),
      totalOffers: offerCount?.total ?? 0,
      activeOffers: activeOfferCount?.total ?? 0,
      categoryDistribution: categoryDistribution.map((c) => ({
        id: c.categoryId,
        label: c.categoryLabel || c.categoryId,
        count: Number(c.productCount),
      })),
      recentProducts: recentProducts.map((p) => ({
        ...p,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  },
);

/* =========================================================================
   3. PRODUCTS CRUD
   ========================================================================= */

export const getAdminProductsFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      search: z.string().optional(),
      categoryId: z.string().optional(),
      activeFilter: z.enum(["all", "active", "inactive"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    // Query all categories for filter dropdown
    const allCategories = await db
      .select({ id: categories.id, label: categories.label })
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    // Build product conditions
    const conditions = [];
    if (data.categoryId && data.categoryId !== "all") {
      conditions.push(eq(products.categoryId, data.categoryId));
    }
    if (data.activeFilter === "active") {
      conditions.push(eq(products.isActive, true));
    } else if (data.activeFilter === "inactive") {
      conditions.push(eq(products.isActive, false));
    }
    if (data.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      conditions.push(
        sql`(${products.name} ILIKE ${q} OR ${products.slug} ILIKE ${q} OR ${products.service} ILIKE ${q})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const prods = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        categoryId: products.categoryId,
        categoryLabel: categories.label,
        productType: products.productType,
        service: products.service,
        description: products.description,
        platforms: products.platforms,
        imageUrl: products.imageUrl,
        accent: products.accent,
        isActive: products.isActive,
        isPopular: products.isPopular,
        sortOrder: products.sortOrder,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereClause)
      .orderBy(asc(products.sortOrder), desc(products.createdAt));

    // Get variant counts and price ranges per product
    const varStats = await db
      .select({
        productId: productVariants.productId,
        count: count(productVariants.id),
        minPrice: sql<number>`MIN(${productVariants.price})`,
        maxPrice: sql<number>`MAX(${productVariants.price})`,
        allAvailable: sql<boolean>`BOOL_AND(${productVariants.isAvailable})`,
      })
      .from(productVariants)
      .groupBy(productVariants.productId);

    const variantStatsMap = new Map(
      varStats.map((s) => [
        s.productId,
        {
          count: Number(s.count),
          minPrice: Number(s.minPrice) || 0,
          maxPrice: Number(s.maxPrice) || 0,
          allAvailable: Boolean(s.allAvailable),
        },
      ]),
    );

    return {
      categories: allCategories,
      products: prods.map((p) => {
        const vStat = variantStatsMap.get(p.id) || {
          count: 0,
          minPrice: 0,
          maxPrice: 0,
          allAvailable: true,
        };
        return {
          ...p,
          variantCount: vStat.count,
          minPrice: vStat.minPrice,
          maxPrice: vStat.maxPrice,
          allAvailable: vStat.allAvailable,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
    };
  });

export const getAdminProductDetailsFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!prod) {
      throw new Error("المنتج غير موجود.");
    }

    const prodVariants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, data.id))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.price));

    const allCategories = await db
      .select({ id: categories.id, label: categories.label })
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    return {
      product: {
        ...prod,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      },
      variants: prodVariants.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      categories: allCategories,
    };
  });

export const createProductFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z
        .string()
        .min(2, "المعرف التعريفي مطلوب")
        .regex(
          /^[a-z0-9_-]+$/,
          "المعرف يجب أن يكون حروفا إنجليزية وأرقاما وشرطات فقط",
        ),
      name: z.string().min(2, "اسم المنتج مطلوب"),
      categoryId: z.string().min(1, "يرجى اختيار القسم"),
      productType: z.enum(["ps_plus", "game", "subscription", "gift_card"]),
      service: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      platforms: z.array(z.string()).default([]),
      imageUrl: z.string().optional().nullable(),
      accent: z.string().default("from-red-700 via-zinc-900 to-black"),
      isActive: z.boolean().default(true),
      isPopular: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    // Check if ID / slug already exists
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (existing) {
      throw new Error(
        `معرف المنتج "${data.id}" مستخدم بالفعل. يرجى اختيار معرف فريد.`,
      );
    }

    // Verify category exists
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);

    if (!cat) {
      throw new Error("القسم المختار غير موجود في قاعدة البيانات.");
    }

    try {
      await db.insert(products).values({
        id: data.id,
        slug: data.id,
        name: data.name.trim(),
        categoryId: data.categoryId,
        productType: data.productType,
        service: data.service?.trim() || null,
        description: data.description?.trim() || null,
        platforms: data.platforms,
        imageUrl: data.imageUrl || null,
        accent: data.accent || "from-red-700 via-zinc-900 to-black",
        isActive: data.isActive,
        isPopular: data.isPopular,
        sortOrder: data.sortOrder,
      });
    } catch (insertErr) {
      // Clean up uploaded image if insert fails so no orphan is left
      if (data.imageUrl) {
        await safeDeleteOldImage(data.imageUrl);
      }
      throw insertErr;
    }

    return { success: true, id: data.id };
  });

export const updateProductFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      name: z.string().min(2, "اسم المنتج مطلوب"),
      categoryId: z.string().min(1, "يرجى اختيار القسم"),
      productType: z.enum(["ps_plus", "game", "subscription", "gift_card"]),
      service: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      platforms: z.array(z.string()).default([]),
      imageUrl: z.string().optional().nullable(),
      accent: z.string().optional(),
      isActive: z.boolean(),
      isPopular: z.boolean(),
      sortOrder: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("المنتج المراد تعديله غير موجود.");
    }

    // Verify category exists
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);

    if (!cat) {
      throw new Error("القسم المختار غير موجود في قاعدة البيانات.");
    }

    const oldImageUrl = existing.imageUrl;
    const newImageUrl = data.imageUrl || null;

    try {
      await db
        .update(products)
        .set({
          name: data.name.trim(),
          categoryId: data.categoryId,
          productType: data.productType,
          service: data.service?.trim() || null,
          description: data.description?.trim() || null,
          platforms: data.platforms,
          imageUrl: newImageUrl,
          accent: data.accent || existing.accent,
          isActive: data.isActive,
          isPopular: data.isPopular,
          sortOrder: data.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(products.id, data.id));
    } catch (dbErr) {
      // If DB update fails, purge newly uploaded image to prevent orphan, preserving old
      if (newImageUrl && newImageUrl !== oldImageUrl) {
        await safeDeleteOldImage(newImageUrl);
      }
      throw dbErr;
    }

    // DB update succeeded! Now safely clean up previous image if replaced
    if (oldImageUrl && oldImageUrl !== newImageUrl) {
      await safeDeleteOldImage(oldImageUrl);
    }

    return { success: true };
  });

export const deleteProductFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("المنتج غير موجود.");
    }

    // Delete product from DB first (cascades to variants via foreign key)
    await db.delete(products).where(eq(products.id, data.id));

    // Only delete image from storage after DB deletion succeeds
    if (existing.imageUrl) {
      await safeDeleteOldImage(existing.imageUrl);
    }

    return { success: true };
  });

export const toggleProductActiveFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("المنتج غير موجود.");
    }

    await db
      .update(products)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(products.id, data.id));

    return { success: true };
  });

/* =========================================================================
   4. PRODUCT VARIANTS CRUD
   ========================================================================= */

export const createProductVariantFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string().min(1),
      edition: z.string().optional().nullable(),
      duration: z.string().optional().nullable(),
      accountSlot: z.string().optional().nullable(),
      denomination: z.string().optional().nullable(),
      price: z
        .number()
        .int("السعر يجب أن يكون رقماً صحيحاً")
        .nonnegative("السعر يجب أن يكون 0 أو أكثر"),
      isAvailable: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [prod] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!prod) {
      throw new Error("المنتج الأصلي للباقة غير موجود.");
    }

    const variantId = `var_${crypto.randomUUID().slice(0, 12)}`;

    await db.insert(productVariants).values({
      id: variantId,
      productId: data.productId,
      edition: data.edition?.trim() || null,
      duration: data.duration?.trim() || null,
      accountSlot: data.accountSlot?.trim() || null,
      denomination: data.denomination?.trim() || null,
      price: data.price,
      isAvailable: data.isAvailable,
      sortOrder: data.sortOrder,
    });

    return { success: true, id: variantId };
  });

export const updateProductVariantFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      edition: z.string().optional().nullable(),
      duration: z.string().optional().nullable(),
      accountSlot: z.string().optional().nullable(),
      denomination: z.string().optional().nullable(),
      price: z
        .number()
        .int("السعر يجب أن يكون رقماً صحيحاً")
        .nonnegative("السعر يجب أن يكون 0 أو أكثر"),
      isAvailable: z.boolean(),
      sortOrder: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("الباقة المراد تعديلها غير موجودة.");
    }

    await db
      .update(productVariants)
      .set({
        edition: data.edition?.trim() || null,
        duration: data.duration?.trim() || null,
        accountSlot: data.accountSlot?.trim() || null,
        denomination: data.denomination?.trim() || null,
        price: data.price,
        isAvailable: data.isAvailable,
        sortOrder: data.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, data.id));

    return { success: true };
  });

export const deleteProductVariantFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("الباقة غير موجودة.");
    }

    await db.delete(productVariants).where(eq(productVariants.id, data.id));

    return { success: true };
  });

export const toggleVariantAvailableFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), isAvailable: z.boolean() }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("الباقة غير موجودة.");
    }

    await db
      .update(productVariants)
      .set({ isAvailable: data.isAvailable, updatedAt: new Date() })
      .where(eq(productVariants.id, data.id));

    return { success: true };
  });

/* =========================================================================
   5. PRODUCT IMAGES UPLOAD
   ========================================================================= */

export const uploadProductImageFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      base64Data: z.string().min(1, "بيانات الصورة مفقودة"),
      filename: z.string().min(1, "اسم الملف مطلوب"),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();

    // Clean base64 header if present
    const base64Clean = data.base64Data.replace(
      /^data:image\/[a-z]+;base64,/,
      "",
    );
    const buffer = Buffer.from(base64Clean, "base64");

    const result = await uploadCatalogImage({
      fileBuffer: buffer,
      filename: data.filename,
      contentType: data.contentType,
    });

    return result;
  });

/* =========================================================================
   6. CATEGORIES CRUD
   ========================================================================= */

export const getAdminCategoriesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAdminSession();
    const db = getDb();

    const cats = await db
      .select({
        id: categories.id,
        label: categories.label,
        sortOrder: categories.sortOrder,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    const prodCounts = await db
      .select({
        categoryId: products.categoryId,
        count: count(products.id),
      })
      .from(products)
      .groupBy(products.categoryId);

    const countMap = new Map(
      prodCounts.map((c) => [c.categoryId, Number(c.count)]),
    );

    return cats.map((c) => ({
      ...c,
      productCount: countMap.get(c.id) || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  },
);

export const createCategoryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z
        .string()
        .min(2, "معرف القسم مطلوب")
        .regex(
          /^[a-z0-9_-]+$/,
          "المعرف يجب أن يكون حروفا إنجليزية وأرقاما فقط",
        ),
      label: z.string().min(2, "اسم القسم بالعربية مطلوب"),
      sortOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.id))
      .limit(1);

    if (existing) {
      throw new Error(`معرف القسم "${data.id}" مستخدم بالفعل.`);
    }

    await db.insert(categories).values({
      id: data.id,
      label: data.label.trim(),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    });

    return { success: true };
  });

export const updateCategoryFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(1),
      label: z.string().min(2, "اسم القسم مطلوب"),
      sortOrder: z.number().int(),
      isActive: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("القسم غير موجود.");
    }

    await db
      .update(categories)
      .set({
        label: data.label.trim(),
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, data.id));

    return { success: true };
  });

export const deleteCategoryFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("القسم غير موجود.");
    }

    // Check if products are assigned
    const [assigned] = await db
      .select({ count: count() })
      .from(products)
      .where(eq(products.categoryId, data.id));

    if (assigned && assigned.count > 0) {
      throw new Error(
        `لا يمكن حذف هذا القسم لوجود ${assigned.count} منتج مرتبط به. يرجى إعادة تعيين أو حذف المنتجات أولاً.`,
      );
    }

    await db.delete(categories).where(eq(categories.id, data.id));
    return { success: true };
  });

/* =========================================================================
   7. OFFERS CRUD
   ========================================================================= */

export const getAdminOffersFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAdminSession();
    const db = getDb();

    const offerList = await db
      .select({
        id: offers.id,
        productId: offers.productId,
        productName: products.name,
        title: offers.title,
        subtitle: offers.subtitle,
        badge: offers.badge,
        discountPrice: offers.discountPrice,
        originalPrice: offers.originalPrice,
        imageUrl: offers.imageUrl,
        accent: offers.accent,
        isActive: offers.isActive,
        validUntil: offers.validUntil,
        sortOrder: offers.sortOrder,
        createdAt: offers.createdAt,
        updatedAt: offers.updatedAt,
      })
      .from(offers)
      .leftJoin(products, eq(offers.productId, products.id))
      .orderBy(asc(offers.sortOrder), desc(offers.createdAt));

    const prods = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .orderBy(asc(products.name));

    const now = new Date();

    return {
      offers: offerList.map((o) => ({
        ...o,
        isExpired: Boolean(o.validUntil && o.validUntil < now),
        validUntil: o.validUntil ? o.validUntil.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      products: prods,
    };
  },
);

export const createOfferFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        title: z.string().min(2, "عنوان العرض مطلوب"),
        subtitle: z.string().optional().nullable(),
        badge: z.string().optional().nullable(),
        productId: z.string().optional().nullable(),
        discountPrice: z.number().int().nonnegative().optional().nullable(),
        originalPrice: z.number().int().nonnegative().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        accent: z.string().optional().nullable(),
        isActive: z.boolean().default(true),
        validUntil: z.string().optional().nullable(),
        sortOrder: z.number().int().default(0),
      })
      .refine(
        (val) => {
          if (val.discountPrice != null && val.originalPrice != null) {
            return val.discountPrice <= val.originalPrice;
          }
          return true;
        },
        {
          message: "سعر الخصم لا يمكن أن يكون أعلى من السعر الأصلي",
          path: ["discountPrice"],
        },
      ),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    // Verify product exists if provided
    if (data.productId) {
      const [prod] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1);
      if (!prod) {
        throw new Error("المنتج المرتبط بالعرض غير موجود.");
      }
    }

    const offerId = `offer_${crypto.randomUUID().slice(0, 10)}`;

    try {
      await db.insert(offers).values({
        id: offerId,
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        badge: data.badge?.trim() || null,
        productId: data.productId || null,
        discountPrice: data.discountPrice ?? null,
        originalPrice: data.originalPrice ?? null,
        imageUrl: data.imageUrl || null,
        accent: data.accent || null,
        isActive: data.isActive,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        sortOrder: data.sortOrder,
      });
    } catch (insertErr) {
      if (data.imageUrl) {
        await safeDeleteOldImage(data.imageUrl);
      }
      throw insertErr;
    }

    return { success: true, id: offerId };
  });

export const updateOfferFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        id: z.string().min(1),
        title: z.string().min(2, "عنوان العرض مطلوب"),
        subtitle: z.string().optional().nullable(),
        badge: z.string().optional().nullable(),
        productId: z.string().optional().nullable(),
        discountPrice: z.number().int().nonnegative().optional().nullable(),
        originalPrice: z.number().int().nonnegative().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        accent: z.string().optional().nullable(),
        isActive: z.boolean(),
        validUntil: z.string().optional().nullable(),
        sortOrder: z.number().int(),
      })
      .refine(
        (val) => {
          if (val.discountPrice != null && val.originalPrice != null) {
            return val.discountPrice <= val.originalPrice;
          }
          return true;
        },
        {
          message: "سعر الخصم لا يمكن أن يكون أعلى من السعر الأصلي",
          path: ["discountPrice"],
        },
      ),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select()
      .from(offers)
      .where(eq(offers.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("العرض غير موجود.");
    }

    if (data.productId) {
      const [prod] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1);
      if (!prod) {
        throw new Error("المنتج المرتبط بالعرض غير موجود.");
      }
    }

    const oldImageUrl = existing.imageUrl;
    const newImageUrl = data.imageUrl || null;

    try {
      await db
        .update(offers)
        .set({
          title: data.title.trim(),
          subtitle: data.subtitle?.trim() || null,
          badge: data.badge?.trim() || null,
          productId: data.productId || null,
          discountPrice: data.discountPrice ?? null,
          originalPrice: data.originalPrice ?? null,
          imageUrl: newImageUrl,
          accent: data.accent || null,
          isActive: data.isActive,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          sortOrder: data.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, data.id));
    } catch (dbErr) {
      if (newImageUrl && newImageUrl !== oldImageUrl) {
        await safeDeleteOldImage(newImageUrl);
      }
      throw dbErr;
    }

    // After DB update succeeds, delete old image if it was replaced
    if (oldImageUrl && oldImageUrl !== newImageUrl) {
      await safeDeleteOldImage(oldImageUrl);
    }

    return { success: true };
  });

export const deleteOfferFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ imageUrl: offers.imageUrl })
      .from(offers)
      .where(eq(offers.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("العرض غير موجود.");
    }

    await db.delete(offers).where(eq(offers.id, data.id));

    if (existing.imageUrl) {
      await safeDeleteOldImage(existing.imageUrl);
    }

    return { success: true };
  });

export const toggleOfferActiveFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    const [existing] = await db
      .select({ id: offers.id })
      .from(offers)
      .where(eq(offers.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("العرض غير موجود.");
    }

    await db
      .update(offers)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(offers.id, data.id));

    return { success: true };
  });

/* =========================================================================
   8. STORE SETTINGS
   ========================================================================= */

export const getAdminSettingsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    await assertAdminSession();
    const db = getDb();

    const all = await db.select().from(storeSettings);
    const map: Record<string, unknown> = {};
    for (const s of all) {
      map[s.key] = s.value;
    }

    return {
      contactInfo: (map.contact_info as Record<string, string>) || {
        primary_whatsapp: "201109664083",
        display_order_number: "01109664083",
        display_payment_number: "01014956483",
        support_hours: "24/7",
      },
      paymentAccounts: (map.payment_accounts as Record<string, string>) || {
        vodafone_cash: "01109664083",
        instapay: "01014956483",
        telda: "@flix90",
      },
      announcement: (map.announcement as {
        active: boolean;
        text: string;
        badge?: string;
        link?: string;
      }) || {
        active: false,
        text: "",
      },
    };
  },
);

export const updateStoreSettingsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      key: z.enum(["contact_info", "payment_accounts", "announcement"]),
      value: z.record(z.unknown()),
    }),
  )
  .handler(async ({ data }) => {
    await assertAdminSession();
    const db = getDb();

    await db
      .insert(storeSettings)
      .values({
        key: data.key,
        value: data.value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeSettings.key,
        set: {
          value: data.value,
          updatedAt: new Date(),
        },
      });

    return { success: true };
  });
