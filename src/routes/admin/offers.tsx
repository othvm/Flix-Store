import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getAdminOffersFn,
  createOfferFn,
  updateOfferFn,
  deleteOfferFn,
  toggleOfferActiveFn,
  uploadProductImageFn,
} from "@/lib/api/admin.functions";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  Calendar,
  Percent,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { useState, useRef } from "react";

export const Route = createFileRoute("/admin/offers")({
  loader: async () => {
    return await getAdminOffersFn();
  },
  component: AdminOffersPage,
});

type OfferItem = Awaited<ReturnType<typeof getAdminOffersFn>>["offers"][number];

function AdminOffersPage() {
  const router = useRouter();
  const data = Route.useLoaderData();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferItem | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<OfferItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badge, setBadge] = useState("");
  const [productId, setProductId] = useState("");
  const [discountPrice, setDiscountPrice] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Async states
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setBadge("خصم حصري 🔥");
    setProductId("");
    setDiscountPrice("");
    setOriginalPrice("");
    setImageUrl("");
    setValidUntil("");
    setIsActive(true);
    setSortOrder(data.offers.length + 1);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (o: OfferItem) => {
    setTitle(o.title);
    setSubtitle(o.subtitle || "");
    setBadge(o.badge || "");
    setProductId(o.productId || "");
    setDiscountPrice(o.discountPrice != null ? String(o.discountPrice) : "");
    setOriginalPrice(o.originalPrice != null ? String(o.originalPrice) : "");
    setImageUrl(o.imageUrl || "");
    setValidUntil(o.validUntil ? o.validUntil.slice(0, 10) : "");
    setIsActive(o.isActive);
    setSortOrder(o.sortOrder);
    setError(null);
    setEditingOffer(o);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("الصيغ المسموحة هي: JPEG, PNG, WebP فقط.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة يتجاوز الحد الأقصى (2 ميجابايت).");
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await uploadProductImageFn({
        data: {
          base64Data,
          filename: file.name,
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        },
      });

      setImageUrl(res.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع صورة العرض.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploadingImage) return;

    const disc = discountPrice ? Number(discountPrice) : null;
    const orig = originalPrice ? Number(originalPrice) : null;
    if (disc !== null && orig !== null && disc > orig) {
      setError("سعر الخصم يجب أن يكون أقل من أو يساوي السعر الأصلي.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        badge: badge.trim() || null,
        productId: productId || null,
        discountPrice: discountPrice ? Number(discountPrice) : null,
        originalPrice: originalPrice ? Number(originalPrice) : null,
        imageUrl: imageUrl.trim() || null,
        validUntil: validUntil || null,
        isActive,
        sortOrder: Number(sortOrder),
      };

      if (editingOffer) {
        await updateOfferFn({
          data: {
            id: editingOffer.id,
            ...payload,
          },
        });
      } else {
        await createOfferFn({ data: payload });
      }

      setShowAddModal(false);
      setEditingOffer(null);
      resetForm();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حفظ العرض.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await toggleOfferActiveFn({ data: { id, isActive: !current } });
      await router.invalidate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل تعديل حالة العرض.");
    }
  };

  const handleDelete = async () => {
    if (!deletingOffer || submitting) return;

    try {
      setSubmitting(true);
      await deleteOfferFn({ data: { id: deletingOffer.id } });
      setDeletingOffer(null);
      await router.invalidate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل حذف العرض.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
            إدارة <span className="text-red-500">العروض والبانرات</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            إنشاء وإدارة عروض الخصم الترويجية والشارات وبانرات الصفحة الرئيسية
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة عرض جديد</span>
        </button>
      </div>

      {/* Offers List */}
      {data.offers.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-12 text-center">
          <Tag className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            لا توجد عروض حالياً
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            أضف أول عرض ترويجي لجذب العملاء وتنشيط مبيعات المتجر.
          </p>
          <button
            onClick={openAdd}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء عرض</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.offers.map((offer) => (
            <div
              key={offer.id}
              className={`rounded-xl border transition-all flex flex-col justify-between p-4 bg-zinc-950/70 backdrop-blur-sm ${
                offer.isActive
                  ? "border-zinc-800/80 hover:border-zinc-700"
                  : "border-zinc-900 opacity-60 hover:opacity-100"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {offer.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950 border border-red-800/60 text-red-400 text-[10px] font-bold">
                        {offer.badge}
                      </span>
                    )}
                    {offer.isExpired && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold">
                        منتهي الصلاحية ⚠️
                      </span>
                    )}
                    <h3 className="font-bold text-white text-sm truncate">
                      {offer.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleActive(offer.id, offer.isActive)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer shrink-0 ${
                      offer.isActive
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                        : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                    }`}
                  >
                    {offer.isActive ? "نشط" : "معطل"}
                  </button>
                </div>

                {offer.subtitle && (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                    {offer.subtitle}
                  </p>
                )}

                {offer.productName && (
                  <div className="text-[11px] text-zinc-500 mb-2">
                    المنتج المرتبط:{" "}
                    <strong className="text-zinc-300 font-medium">
                      {offer.productName}
                    </strong>
                  </div>
                )}

                {/* Price Display */}
                {(offer.discountPrice != null ||
                  offer.originalPrice != null) && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 mb-3 text-xs">
                    {offer.discountPrice != null && (
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {offer.discountPrice} ج.م
                      </span>
                    )}
                    {offer.originalPrice != null && (
                      <span className="font-mono line-through text-zinc-500 text-xs">
                        {offer.originalPrice} ج.م
                      </span>
                    )}
                  </div>
                )}

                {offer.validUntil && (
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>صالح حتى: {offer.validUntil.slice(0, 10)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => openEdit(offer)}
                  className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="تعديل العرض"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeletingOffer(offer)}
                  className="p-1.5 rounded-lg border border-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="حذف العرض"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT OFFER                                                   */}
      {/* ========================================================================= */}
      {(showAddModal || editingOffer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h2 className="text-base font-bold text-white font-display">
                {editingOffer ? "تعديل العرض الترويجي" : "إنشاء عرض جديد"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingOffer(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  عنوان العرض *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: خصم خاص على اشتراكات PS Plus"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    شارة العرض (Badge)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="خصم 30%, عرض الصيف..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    ربط بمنتج (اختياري)
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="">بدون ربط (عرض عام)</option>
                    {data.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  الوصف الإضافي
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="تفاصيل العرض والشروط..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    السعر بعد الخصم (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="1200"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    السعر الأصلي (ج.م)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="1600"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  تاريخ انتهاء العرض (اختياري)
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 text-red-600 bg-zinc-900"
                  />
                  <span>تفعيل العرض فورياً</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingOffer(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingImage}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {submitting && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    <span>{editingOffer ? "حفظ التعديل" : "إنشاء العرض"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE OFFER                                                       */}
      {/* ========================================================================= */}
      {deletingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                تأكيد حذف العرض
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف العرض{" "}
              <strong className="text-white">"{deletingOffer.title}"</strong>؟
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOffer(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف العرض</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
