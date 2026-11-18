import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/db";
import {
  categories,
  products,
  productVariants,
  offers,
  storeSettings,
} from "@/db/schema";
import { eq, and, or, isNull, gte, asc } from "drizzle-orm";
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_STORE_SETTINGS,
} from "@/db/seed-data";

export interface StorefrontData {
  categories: Array<{
    id: string;
    label: string;
    sortOrder: number;
  }>;
  psPlusPrices: Record<
    "Essential" | "Extra",
    Record<"شهر" | "3 شهور" | "سنة", Record<"Prim5" | "Prim4" | "Sec", number>>
  >;
  psPlusAvailability: Record<
    "Essential" | "Extra",
    Record<"شهر" | "3 شهور" | "سنة", Record<"Prim5" | "Prim4" | "Sec", boolean>>
  >;
  games: Array<{
    id: string;
    slug: string;
    name: string;
    platforms: string[];
    slots?: {
      prim5: number | null;
      prim4: number | null;
      sec: number | null;
    };
    editions?: Array<{
      label: string;
      slots: {
        prim5: number | null;
        prim4: number | null;
        sec: number | null;
      };
    }>;
    simplePrice?: number | null;
    simpleLabel?: string;
    isAvailable?: boolean;
    giftAmounts?: Array<{
      label: string;
      price: number;
      isAvailable: boolean;
    }>;
    accent: string;
    imageUrl?: string | null;
    isPopular?: boolean;
    service?: string | null;
    description?: string | null;
  }>;
  offers: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    badge: string | null;
    discountPrice: number | null;
    originalPrice: number | null;
    imageUrl: string | null;
    accent: string | null;
    validUntil: string | null;
    productId: string | null;
  }>;
  settings: {
    contactInfo: {
      primaryWhatsapp: string;
      displayOrderNumber: string;
      displayPaymentNumber: string;
      supportHours: string;
    };
    paymentAccounts: {
      vodafoneCash: string;
      instapay: string;
      telda: string;
    };
    announcement: {
      active: boolean;
      text: string;
    };
  };
}

interface RawDataInput {
  categories: Array<{ id: string; label: string; sortOrder: number }>;
  products: Array<{
    id: string;
    slug: string;
    name: string;
    productType: string;
    platforms: string[] | null;
    accent: string;
    imageUrl?: string | null;
    isPopular?: boolean | null;
    service?: string | null;
    description?: string | null;
  }>;
  variants: Array<{
    id: string;
    productId: string;
    edition?: string | null;
    duration?: string | null;
    accountSlot?: string | null;
    denomination?: string | null;
    price: number;
    isAvailable: boolean;
  }>;
  offers: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    badge: string | null;
    discountPrice: number | null;
    originalPrice: number | null;
    imageUrl: string | null;
    accent: string | null;
    validUntil: Date | string | null;
    productId: string | null;
  }>;
  settingsMap: Record<string, unknown>;
}

function transformRawToStorefrontData(raw: RawDataInput): StorefrontData {
  const {
    categories: activeCats,
    products: activeProds,
    variants: allVariants,
    offers: activeOffers,
    settingsMap,
  } = raw;

  // Build PS Plus calculator pricing matrix
  const psPlusPrices: StorefrontData["psPlusPrices"] = {
    Essential: {
      شهر: { Prim5: 0, Prim4: 0, Sec: 0 },
      "3 شهور": { Prim5: 0, Prim4: 0, Sec: 0 },
      سنة: { Prim5: 0, Prim4: 0, Sec: 0 },
    },
    Extra: {
      شهر: { Prim5: 0, Prim4: 0, Sec: 0 },
      "3 شهور": { Prim5: 0, Prim4: 0, Sec: 0 },
      سنة: { Prim5: 0, Prim4: 0, Sec: 0 },
    },
  };

  const psPlusAvailability: StorefrontData["psPlusAvailability"] = {
    Essential: {
      شهر: { Prim5: false, Prim4: false, Sec: false },
      "3 شهور": { Prim5: false, Prim4: false, Sec: false },
      سنة: { Prim5: false, Prim4: false, Sec: false },
    },
    Extra: {
      شهر: { Prim5: false, Prim4: false, Sec: false },
      "3 شهور": { Prim5: false, Prim4: false, Sec: false },
      سنة: { Prim5: false, Prim4: false, Sec: false },
    },
  };

  const psPlusProd = activeProds.find(
    (p) =>
      p.slug === "ps-plus" ||
      p.slug === "playstation-plus" ||
      p.id === "playstation-plus",
  );

  if (psPlusProd) {
    const psVariants = allVariants.filter((v) => v.productId === psPlusProd.id);
    for (const v of psVariants) {
      const tier = v.edition as "Essential" | "Extra";
      const dur = v.duration as "شهر" | "3 شهور" | "سنة";
      const slot =
        v.accountSlot === "prim5"
          ? "Prim5"
          : v.accountSlot === "prim4"
            ? "Prim4"
            : v.accountSlot === "sec"
              ? "Sec"
              : null;

      if (
        tier &&
        dur &&
        slot &&
        psPlusPrices[tier] &&
        psPlusPrices[tier][dur]
      ) {
        psPlusPrices[tier][dur][slot] = v.price;
        psPlusAvailability[tier][dur][slot] = Boolean(
          v.isAvailable && v.price > 0,
        );
      }
    }
  }

  // Map products to games/offers grid
  const gamesGrid: StorefrontData["games"] = [];
  const nonPsPlusProds = activeProds.filter(
    (p) =>
      p.slug !== "ps-plus" &&
      p.slug !== "playstation-plus" &&
      p.id !== "playstation-plus",
  );

  for (const p of nonPsPlusProds) {
    const pVariants = allVariants.filter((v) => v.productId === p.id);

    if (p.productType === "gift_card") {
      gamesGrid.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        platforms: p.platforms || [],
        giftAmounts: pVariants.map((v) => ({
          label: v.denomination || "",
          price: v.price,
          isAvailable: Boolean(v.isAvailable && v.price > 0),
        })),
        accent: p.accent,
        imageUrl: p.imageUrl,
        isPopular: Boolean(p.isPopular),
        service: p.service,
        description: p.description,
      });
    } else if (p.productType === "game") {
      const hasEditions = pVariants.some((v) => Boolean(v.edition));

      if (hasEditions) {
        const editionsMap = new Map<
          string,
          {
            label: string;
            slots: {
              prim5: number | null;
              prim4: number | null;
              sec: number | null;
            };
          }
        >();

        for (const v of pVariants) {
          const edName = v.edition || "Standard Edition";
          if (!editionsMap.has(edName)) {
            editionsMap.set(edName, {
              label: edName,
              slots: { prim5: null, prim4: null, sec: null },
            });
          }
          const ed = editionsMap.get(edName)!;
          const slot = v.accountSlot?.toLowerCase();
          if (slot === "prim5")
            ed.slots.prim5 = v.isAvailable && v.price > 0 ? v.price : null;
          else if (slot === "prim4")
            ed.slots.prim4 = v.isAvailable && v.price > 0 ? v.price : null;
          else if (slot === "sec")
            ed.slots.sec = v.isAvailable && v.price > 0 ? v.price : null;
        }

        gamesGrid.push({
          id: p.id,
          slug: p.slug,
          name: p.name,
          platforms: p.platforms || [],
          editions: Array.from(editionsMap.values()),
          accent: p.accent,
          imageUrl: p.imageUrl,
          isPopular: Boolean(p.isPopular),
          service: p.service,
          description: p.description,
        });
      } else {
        const slots: {
          prim5: number | null;
          prim4: number | null;
          sec: number | null;
        } = {
          prim5: null,
          prim4: null,
          sec: null,
        };

        for (const v of pVariants) {
          const slot = v.accountSlot?.toLowerCase();
          if (slot === "prim5")
            slots.prim5 = v.isAvailable && v.price > 0 ? v.price : null;
          else if (slot === "prim4")
            slots.prim4 = v.isAvailable && v.price > 0 ? v.price : null;
          else if (slot === "sec")
            slots.sec = v.isAvailable && v.price > 0 ? v.price : null;
        }

        gamesGrid.push({
          id: p.id,
          slug: p.slug,
          name: p.name,
          platforms: p.platforms || [],
          slots,
          accent: p.accent,
          imageUrl: p.imageUrl,
          isPopular: Boolean(p.isPopular),
          service: p.service,
          description: p.description,
        });
      }
    } else {
      const primaryVariant = pVariants[0];
      const isAvailable = Boolean(
        primaryVariant &&
        primaryVariant.isAvailable &&
        primaryVariant.price > 0,
      );
      gamesGrid.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        platforms: p.platforms || [],
        simplePrice: isAvailable ? primaryVariant.price : null,
        simpleLabel: primaryVariant?.duration ?? "شهر",
        isAvailable,
        accent: p.accent,
        imageUrl: p.imageUrl,
        isPopular: Boolean(p.isPopular),
        service: p.service,
        description: p.description,
      });
    }
  }

  // Settings extraction
  const rawContact =
    (settingsMap.contact_info as Record<string, unknown>) || {};
  const rawPayment =
    (settingsMap.payment_accounts as Record<string, unknown>) || {};
  const rawAnnouncement =
    (settingsMap.announcement as { active?: boolean; text?: string }) ||
    (settingsMap.announcement_banner as {
      is_active?: boolean;
      text?: string;
    }) ||
    {};

  const extractString = (val: unknown, fallback: string): string => {
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (typeof obj.number === "string" && obj.number.trim().length > 0)
        return obj.number.trim();
      if (typeof obj.id === "string" && obj.id.trim().length > 0)
        return obj.id.trim();
      if (typeof obj.value === "string" && obj.value.trim().length > 0)
        return obj.value.trim();
    }
    return fallback;
  };

  const contactInfo = {
    primaryWhatsapp: extractString(
      rawContact.primary_whatsapp ||
        rawContact.primaryWhatsapp ||
        rawContact.primary_order_wa,
      "201109664083",
    ),
    displayOrderNumber: extractString(
      rawContact.display_order_number || rawContact.displayOrderNumber,
      "01109664083",
    ),
    displayPaymentNumber: extractString(
      rawContact.display_payment_number || rawContact.displayPaymentNumber,
      "01014956483",
    ),
    supportHours: extractString(
      rawContact.support_hours || rawContact.supportHours,
      "24/7",
    ),
  };

  const paymentAccounts = {
    vodafoneCash: extractString(
      rawPayment.vodafone_cash || rawPayment.vodafoneCash,
      "01109664083",
    ),
    instapay: extractString(rawPayment.instapay, "01014956483"),
    telda: extractString(rawPayment.telda, "@flix90"),
  };

  const announcement = {
    active: Boolean(
      rawAnnouncement.active ??
      (rawAnnouncement as { is_active?: boolean }).is_active,
    ),
    text: rawAnnouncement.text || "",
  };

  return {
    categories: activeCats.map((c) => ({
      id: c.id,
      label: c.label,
      sortOrder: c.sortOrder,
    })),
    psPlusPrices,
    psPlusAvailability,
    games: gamesGrid,
    offers: activeOffers.map((o) => ({
      id: o.id,
      title: o.title,
      subtitle: o.subtitle,
      badge: o.badge,
      discountPrice: o.discountPrice,
      originalPrice: o.originalPrice,
      imageUrl: o.imageUrl,
      accent: o.accent,
      validUntil: o.validUntil
        ? typeof o.validUntil === "string"
          ? o.validUntil
          : o.validUntil.toISOString()
        : null,
      productId: o.productId,
    })),
    settings: {
      contactInfo,
      paymentAccounts,
      announcement,
    },
  };
}

export function getFallbackStorefrontData(): StorefrontData {
  const activeCats = SEED_CATEGORIES.filter((c) => c.isActive).map((c) => ({
    id: c.id,
    label: c.label,
    sortOrder: c.sortOrder,
  }));

  const activeProds = SEED_PRODUCTS.filter((p) => p.isActive).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    productType: p.productType,
    platforms: p.platforms,
    accent: p.accent,
    imageUrl: p.imageUrl ?? null,
    isPopular: p.isPopular,
    service: p.service ?? null,
    description: p.description ?? null,
  }));

  const allVariants = SEED_PRODUCTS.flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      productId: p.id,
      edition: v.edition ?? null,
      duration: v.duration ?? null,
      accountSlot: v.accountSlot ?? null,
      denomination: v.denomination ?? null,
      price: v.price,
      isAvailable: v.isAvailable,
      sortOrder: v.sortOrder,
    })),
  );

  const settingsMap: Record<string, unknown> = {};
  for (const s of SEED_STORE_SETTINGS) {
    settingsMap[s.key] = s.value;
  }

  return transformRawToStorefrontData({
    categories: activeCats,
    products: activeProds,
    variants: allVariants,
    offers: [],
    settingsMap,
  });
}

export const getStorefrontDataFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<StorefrontData> => {
    try {
      const db = getDb();
      const now = new Date();

      // 1. Fetch active categories
      const activeCats = await db
        .select()
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder));

      // 2. Fetch active products
      const activeProds = await db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(asc(products.sortOrder));

      // 3. Fetch all variants
      const allVariants = await db
        .select()
        .from(productVariants)
        .orderBy(asc(productVariants.sortOrder));

      // 4. Fetch active non-expired offers
      const activeOffers = await db
        .select()
        .from(offers)
        .where(
          and(
            eq(offers.isActive, true),
            or(isNull(offers.validUntil), gte(offers.validUntil, now)),
          ),
        )
        .orderBy(asc(offers.sortOrder));

      // 5. Fetch store settings
      const rawSettings = await db.select().from(storeSettings);
      const settingsMap: Record<string, unknown> = {};
      for (const s of rawSettings) {
        settingsMap[s.key] = s.value;
      }

      if (!activeProds || activeProds.length === 0) {
        console.warn(
          "Database returned 0 products, falling back to seed catalog.",
        );
        return getFallbackStorefrontData();
      }

      return transformRawToStorefrontData({
        categories: activeCats,
        products: activeProds,
        variants: allVariants,
        offers: activeOffers,
        settingsMap,
      });
    } catch (error) {
      console.warn(
        "Storefront DB query failed, serving verified seed fallback:",
        error,
      );
      return getFallbackStorefrontData();
    }
  },
);
