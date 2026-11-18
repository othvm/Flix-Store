import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getAdminProductsFn,
  getAdminProductDetailsFn,
  createProductFn,
  updateProductFn,
  deleteProductFn,
  toggleProductActiveFn,
  createProductVariantFn,
  updateProductVariantFn,
  deleteProductVariantFn,
  toggleVariantAvailableFn,
  uploadProductImageFn,
} from "@/lib/api/admin.functions";
import {
  Package,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  Layers,
  Upload,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Gamepad2,
  Tag,
  DollarSign,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";

export const Route = createFileRoute("/admin/products")({
  loader: async () => {
    return await getAdminProductsFn({ data: {} });
  },
  component: AdminProductsPage,
});

type ProductItem = Awaited<
  ReturnType<typeof getAdminProductsFn>
>["products"][number];

function AdminProductsPage() {
  const router = useRouter();
  const initialData = Route.useLoaderData();

  // Search & filter states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(
    null,
  );
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(
    null,
  );
  const [managingVariantsProduct, setManagingVariantsProduct] =
    useState<ProductItem | null>(null);

  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return initialData.products.filter((p) => {
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) {
        return false;
      }
      if (activeFilter === "active" && !p.isActive) return false;
      if (activeFilter === "inactive" && p.isActive) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesService = p.service?.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesService) return false;
      }
      return true;
    });
  }, [initialData.products, search, selectedCategory, activeFilter]);

  // Toggle active product
  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleProductActiveFn({
        data: { id, isActive: !current },
      });
      await router.invalidate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تعديل حالة ظهور المنتج.");
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      setSubmitting(true);
      setActionError(null);
      await deleteProductFn({
        data: { id: deletingProduct.id },
      });
      await router.invalidate();
      setDeletingProduct(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حذف المنتج.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
            إدارة <span className="text-red-500">المنتجات والأسعار</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            تحكم بكتالوج الألعاب، اشتراكات PS Plus، فئات البطاقات والأسعار
            المتاحة على المتجر
          </p>
        </div>
        <button
          onClick={() => {
            setActionError(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو المعرف (GTA, Netflix, PS Plus...)"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 pr-9 pl-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="all">
              جميع الأقسام ({initialData.products.length})
            </option>
            {initialData.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Active Status Filter */}
          <select
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-red-500 transition cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="active">معروض فقط</option>
            <option value="inactive">مخفي فقط</option>
          </select>
        </div>
      </div>

      {/* Products Count Indicator */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>
          عرض {filteredProducts.length} من أصل {initialData.products.length}{" "}
          منتج
        </span>
      </div>

      {/* Products Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-12 text-center">
          <Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            لا توجد منتجات مطابقة للبحث
          </h3>
          <p className="text-xs text-zinc-500">
            جرب تعديل كلمة البحث أو فلتر القسم المختار.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border transition-all flex flex-col justify-between p-4 bg-zinc-950/70 backdrop-blur-sm ${
                p.isActive
                  ? "border-zinc-800/80 hover:border-zinc-700"
                  : "border-zinc-900 opacity-60 hover:opacity-100"
              }`}
            >
              <div>
                {/* Header: Thumbnail + Title + Status */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-lg border border-zinc-800 bg-zinc-900 shrink-0 overflow-hidden relative flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Gamepad2 className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3
                        className="font-semibold text-white text-sm truncate"
                        title={p.name}
                      >
                        {p.name}
                      </h3>
                      <button
                        onClick={() => handleToggleActive(p.id, p.isActive)}
                        title={
                          p.isActive
                            ? "تعطيل العرض على المتجر"
                            : "تفعيل العرض على المتجر"
                        }
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer ${
                          p.isActive
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                            : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                        }`}
                      >
                        {p.isActive ? "معروض" : "مخفي"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                      <span className="truncate">
                        {p.categoryLabel || p.categoryId}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500 text-[10px] truncate">
                        {p.slug}
                      </span>
                    </div>

                    {/* Platforms Badges */}
                    {p.platforms && p.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.platforms.map((pl: string) => (
                          <span
                            key={pl}
                            className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono"
                          >
                            {pl}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description snippet */}
                {p.description && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
                    {p.description}
                  </p>
                )}

                {/* Pricing / Variants Summary */}
                <div className="rounded-lg border border-zinc-900 bg-zinc-900/40 p-2.5 mb-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Layers className="w-3.5 h-3.5 text-red-500" />
                    <span>{p.variantCount} باقات وأسعار</span>
                  </div>
                  <div className="font-mono font-bold text-white text-xs">
                    {p.variantCount > 0 ? (
                      p.minPrice === p.maxPrice ? (
                        <span>{p.minPrice} ج.م</span>
                      ) : (
                        <span>
                          {p.minPrice} - {p.maxPrice} ج.م
                        </span>
                      )
                    ) : (
                      <span className="text-zinc-500 font-normal">
                        لا توجد باقات
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-900/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setManagingVariantsProduct(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 text-red-400 text-xs font-medium transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>الأسعار والباقات ({p.variantCount})</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActionError(null);
                      setEditingProduct(p);
                    }}
                    title="تعديل بيانات المنتج"
                    className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setActionError(null);
                      setDeletingProduct(p);
                    }}
                    title="حذف المنتج"
                    className="p-1.5 rounded-lg border border-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT                                              */}
      {/* ========================================================================= */}
      {(showAddModal || editingProduct) && (
        <ProductFormModal
          isEdit={Boolean(editingProduct)}
          product={editingProduct}
          categories={initialData.categories}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
            setActionError(null);
          }}
          onSuccess={async () => {
            setShowAddModal(false);
            setEditingProduct(null);
            await router.invalidate();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE PRODUCT VARIANTS & PRICES                                 */}
      {/* ========================================================================= */}
      {managingVariantsProduct && (
        <ManageVariantsModal
          product={managingVariantsProduct}
          onClose={() => {
            setManagingVariantsProduct(null);
          }}
          onUpdated={async () => {
            await router.invalidate();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                تأكيد حذف المنتج
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف المنتج{" "}
              <strong className="text-white">"{deletingProduct.name}"</strong>؟
              سيؤدي هذا إلى حذف جميع باقات الأسعار المرتبطة به (
              {deletingProduct.variantCount} باقة) وصورته المخزنة.
            </p>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-xs text-red-300">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteProduct}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف المنتج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: ProductFormModal (Create / Update Product with Image Upload)
   ========================================================================= */

function ProductFormModal({
  isEdit,
  product,
  categories,
  onClose,
  onSuccess,
}: {
  isEdit: boolean;
  product?: ProductItem | null;
  categories: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || product?.id || "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || categories[0]?.id || "games",
  );
  const [productType, setProductType] = useState(
    product?.productType || "game",
  );
  const [service, setService] = useState(product?.service || "");
  const [description, setDescription] = useState(product?.description || "");
  const [platforms, setPlatforms] = useState<string[]>(
    product?.platforms || ["PS4", "PS5"],
  );
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || "");
  const [accent, setAccent] = useState(
    product?.accent || "from-red-700 via-zinc-900 to-black",
  );
  const [isActive, setIsActive] = useState<boolean>(product?.isActive ?? true);
  const [isPopular, setIsPopular] = useState<boolean>(
    product?.isPopular ?? false,
  );
  const [sortOrder, setSortOrder] = useState<number>(product?.sortOrder ?? 0);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug when typing name in create mode
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && !slug) {
      const generated = val
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (generated) setSlug(generated);
    }
  };

  const handlePlatformToggle = (plat: string) => {
    if (platforms.includes(plat)) {
      setPlatforms(platforms.filter((p) => p !== plat));
    } else {
      setPlatforms([...platforms, plat]);
    }
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("نوع الصورة غير مدعوم. الصيغ المسموحة هي: JPEG, PNG, WebP فقط.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة يتجاوز الحد الأقصى المسموح (2 ميجابايت).");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Read file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const uploadRes = await uploadProductImageFn({
        data: {
          base64Data,
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        },
      });

      setImageUrl(uploadRes.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "فشل رفع الصورة إلى Supabase Storage.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploading) return;

    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && product) {
        await updateProductFn({
          data: {
            id: product.id,
            name: name.trim(),
            categoryId,
            productType: productType as
              "game" | "ps_plus" | "gift_card" | "subscription",
            service: service.trim() || null,
            description: description.trim() || null,
            platforms,
            imageUrl: imageUrl || null,
            accent,
            isActive,
            isPopular,
            sortOrder,
          },
        });
      } else {
        await createProductFn({
          data: {
            id: slug.trim(),
            name: name.trim(),
            categoryId,
            productType: productType as
              "game" | "ps_plus" | "gift_card" | "subscription",
            service: service.trim() || null,
            description: description.trim() || null,
            platforms,
            imageUrl: imageUrl || null,
            accent,
            isActive,
            isPopular,
            sortOrder,
          },
        });
      }

      await onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ المنتج.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-5">
          <h2 className="text-lg font-bold text-white font-display">
            {isEdit ? "تعديل بيانات المنتج" : "إضافة منتج جديد للمتجر"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                اسم المنتج (عربي أو إنجليزي) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="مثال: Grand Theft Auto VI"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Product ID / Slug */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                المعرف الفريد (Slug / ID) *
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="gta6"
                dir="ltr"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500 transition disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                القسم *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                نوع المنتج *
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                <option value="game">لعبة (PS4 / PS5)</option>
                <option value="ps_plus">PlayStation Plus</option>
                <option value="subscription">
                  اشتراك رقمي (ستريمينج / موسيقى)
                </option>
                <option value="gift_card">بطاقة هدايا ورصيد</option>
              </select>
            </div>

            {/* Service Label */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                اسم الخدمة (اختياري)
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="PlayStation, Netflix..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition"
              />
            </div>
          </div>

          {/* Platforms Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              المنصات المدعومة
            </label>
            <div className="flex flex-wrap gap-2">
              {["PS4", "PS5", "PC", "Mobile", "Xbox"].map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePlatformToggle(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition cursor-pointer ${
                      active
                        ? "bg-red-600 border-red-500 text-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {active ? `✓ ${p}` : p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image Upload & Preview */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              صورة المنتج (JPEG, PNG, WebP — أقصى حجم 2MB)
            </label>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-600" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-white transition cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {uploading ? "جاري الرفع..." : "اختر صورة من الجهاز"}
                  </span>
                </button>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="أو أدخل رابط صورة مباشر (URL)"
                  dir="ltr"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              وصف المنتج (يظهر للعميل عند الشراء)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل الحساب أو اللعبة..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          {/* Toggles & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-900">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 text-red-600 focus:ring-0 bg-zinc-900"
              />
              <span>تفعيل العرض على المتجر</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPopular}
                onChange={(e) => setIsPopular(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 text-red-600 focus:ring-0 bg-zinc-900"
              />
              <span>تمييز كـ "الأكثر طلباً" ⭐</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 whitespace-nowrap">
                الترتيب:
              </span>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-white text-center font-mono"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition shadow-lg shadow-red-600/25 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEdit ? "حفظ التعديلات" : "إضافة المنتج"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   SUB-COMPONENT: ManageVariantsModal (Add, Edit, Delete Prices & Slots)
   ========================================================================= */

type VariantItem = Awaited<
  ReturnType<typeof getAdminProductDetailsFn>
>["variants"][number];

function ManageVariantsModal({
  product,
  onClose,
  onUpdated,
}: {
  product: ProductItem;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New variant form state
  const [edition, setEdition] = useState("");
  const [duration, setDuration] = useState("");
  const [accountSlot, setAccountSlot] = useState("prim5");
  const [denomination, setDenomination] = useState("");
  const [price, setPrice] = useState<number>(500);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [addingVariant, setAddingVariant] = useState(false);

  // Inline editing state
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<string>("");
  const [editSlot, setEditSlot] = useState<string>("");
  const [editEdition, setEditEdition] = useState<string>("");
  const [editDenomination, setEditDenomination] = useState<string>("");

  // Load details
  const fetchVariants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminProductDetailsFn({ data: { id: product.id } });
      setVariants(res.variants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل باقات المنتج.");
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    void fetchVariants();
  }, [fetchVariants]);

  // Handle Add Variant
  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingVariant) return;

    try {
      setAddingVariant(true);
      setError(null);

      await createProductVariantFn({
        data: {
          productId: product.id,
          edition: edition.trim() || null,
          duration: duration.trim() || null,
          accountSlot:
            product.productType === "game" || product.productType === "ps_plus"
              ? accountSlot
              : null,
          denomination: denomination.trim() || null,
          price: Number(price),
          isAvailable,
          sortOrder: variants.length + 1,
        },
      });

      // Reset form
      setEdition("");
      setDuration("");
      setDenomination("");
      setPrice(500);

      await fetchVariants();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إضافة الباقة.");
    } finally {
      setAddingVariant(false);
    }
  };

  // Toggle variant availability
  const handleToggleAvailable = async (vId: string, current: boolean) => {
    try {
      await toggleVariantAvailableFn({
        data: { id: vId, isAvailable: !current },
      });
      await fetchVariants();
      await onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تعديل حالة التوفر.");
    }
  };

  // Delete variant
  const handleDeleteVariant = async (vId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السعر/الباقة نهائياً؟")) return;
    try {
      await deleteProductVariantFn({ data: { id: vId } });
      await fetchVariants();
      await onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حذف الباقة.");
    }
  };

  // Start inline edit
  const startEdit = (v: VariantItem) => {
    setEditingVariantId(v.id);
    setEditPrice(v.price);
    setEditDuration(v.duration || "");
    setEditSlot(v.accountSlot || "prim5");
    setEditEdition(v.edition || "");
    setEditDenomination(v.denomination || "");
  };

  // Save inline edit
  const saveEdit = async (v: VariantItem) => {
    try {
      await updateProductVariantFn({
        data: {
          id: v.id,
          edition: editEdition.trim() || null,
          duration: editDuration.trim() || null,
          accountSlot: editSlot || null,
          denomination: editDenomination.trim() || null,
          price: Number(editPrice),
          isAvailable: v.isAvailable,
          sortOrder: v.sortOrder,
        },
      });
      setEditingVariantId(null);
      await fetchVariants();
      await onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حفظ التعديلات.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <h2 className="text-lg font-bold text-white font-display">
              إدارة الأسعار والباقات —{" "}
              <span className="text-red-500">{product.name}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              حدد الأسعار حسب الحساب (Prim5 / Prim4 / Sec) أو المدة أو الفئة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Variants Table */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/80 text-xs font-semibold text-zinc-300">
            <span>الباقات والأسعار الحالية ({variants.length})</span>
            <span className="text-[11px] text-zinc-500 font-normal">
              اضغط على السعر أو الحالة للتعديل الفوري
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span>جاري تحميل الباقات...</span>
            </div>
          ) : variants.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              لا توجد باقات أو أسعار مسجلة لهذا المنتج بعد. أضف باقة جديدة
              بالأسفل.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
              {variants.map((v) => {
                const isEditing = editingVariantId === v.id;
                return (
                  <div
                    key={v.id}
                    className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-zinc-900/30 transition"
                  >
                    {isEditing ? (
                      /* Inline Editing Row */
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {product.productType === "game" && (
                          <select
                            value={editSlot}
                            onChange={(e) => setEditSlot(e.target.value)}
                            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                          >
                            <option value="prim5">Prim 5 (PS5)</option>
                            <option value="prim4">Prim 4 (PS4)</option>
                            <option value="sec">Sec (ثانوي)</option>
                          </select>
                        )}

                        <input
                          type="text"
                          value={
                            editDuration || editEdition || editDenomination
                          }
                          onChange={(e) => {
                            if (v.denomination)
                              setEditDenomination(e.target.value);
                            else if (v.edition) setEditEdition(e.target.value);
                            else setEditDuration(e.target.value);
                          }}
                          placeholder="البيان / المدة"
                          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white"
                        />

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editPrice}
                            onChange={(e) =>
                              setEditPrice(Number(e.target.value))
                            }
                            className="w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-white font-mono"
                          />
                          <span className="text-zinc-500">ج.م</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => saveEdit(v)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingVariantId(null)}
                            className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Row */
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          {v.accountSlot && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[11px] uppercase">
                              {v.accountSlot}
                            </span>
                          )}
                          {v.edition && (
                            <span className="text-zinc-300 font-medium">
                              {v.edition}
                            </span>
                          )}
                          {v.duration && (
                            <span className="text-zinc-400 text-[11px]">
                              ({v.duration})
                            </span>
                          )}
                          {v.denomination && (
                            <span className="text-blue-400 font-medium">
                              {v.denomination}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-white text-sm">
                            {v.price} ج.م
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleToggleAvailable(v.id, v.isAvailable)
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer ${
                              v.isAvailable
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                                : "bg-red-950/60 text-red-400 border border-red-900/40"
                            }`}
                          >
                            {v.isAvailable ? "متوفر" : "نفد المخزون"}
                          </button>

                          <button
                            type="button"
                            onClick={() => startEdit(v)}
                            title="تعديل السعر"
                            className="p-1 rounded text-zinc-400 hover:text-white transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(v.id)}
                            title="حذف الباقة"
                            className="p-1 rounded text-zinc-500 hover:text-red-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Variant Form */}
        <form
          onSubmit={handleAddVariant}
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-white mb-1">
            <Plus className="w-3.5 h-3.5 text-red-500" />
            <span>إضافة باقة / سعر جديد لهذا المنتج</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Slot selector for games or PS Plus */}
            {(product.productType === "game" ||
              product.productType === "ps_plus") && (
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  نوع الحساب
                </label>
                <select
                  value={accountSlot}
                  onChange={(e) => setAccountSlot(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="prim5">Prim 5 (أساسي PS5)</option>
                  <option value="prim4">Prim 4 (أساسي PS4)</option>
                  <option value="sec">Sec (حساب ثانوي)</option>
                </select>
              </div>
            )}

            {/* Edition (GTA 6 Ultimate, PS Plus Essential, etc.) */}
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                النسخة / الفئة
              </label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Standard, Ultimate..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Duration / Denomination */}
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                المدة أو القيمة
              </label>
              <input
                type="text"
                value={
                  product.productType === "gift_card" ? denomination : duration
                }
                onChange={(e) => {
                  if (product.productType === "gift_card")
                    setDenomination(e.target.value);
                  else setDuration(e.target.value);
                }}
                placeholder={
                  product.productType === "gift_card"
                    ? "مثال: 50 $"
                    : "شهر، سنة..."
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Price (EGP) */}
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                السعر (جنيه مصري) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-800 text-red-600 bg-zinc-900"
              />
              <span>متوفر في المخزون للطلب الفوري</span>
            </label>

            <button
              type="submit"
              disabled={addingVariant}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
            >
              {addingVariant && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>إضافة السعر</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
