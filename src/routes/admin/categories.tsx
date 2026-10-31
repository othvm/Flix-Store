import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getAdminCategoriesFn,
  createCategoryFn,
  updateCategoryFn,
  deleteCategoryFn,
} from "@/lib/api/admin.functions";
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Package,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/categories")({
  loader: async () => {
    return await getAdminCategoriesFn();
  },
  component: AdminCategoriesPage,
});

type CategoryItem = Awaited<ReturnType<typeof getAdminCategoriesFn>>[number];

function AdminCategoriesPage() {
  const router = useRouter();
  const categories = Route.useLoaderData();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
    null,
  );
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(
    null,
  );

  // Form states
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Async states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setId("");
    setLabel("");
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setError(null);
  };

  const openAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEdit = (c: CategoryItem) => {
    setId(c.id);
    setLabel(c.label);
    setSortOrder(c.sortOrder);
    setIsActive(c.isActive);
    setError(null);
    setEditingCategory(c);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      await createCategoryFn({
        data: {
          id: id.trim().toLowerCase(),
          label: label.trim(),
          sortOrder: Number(sortOrder),
          isActive,
        },
      });

      setShowAddModal(false);
      resetForm();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إضافة القسم.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      await updateCategoryFn({
        data: {
          id: editingCategory.id,
          label: label.trim(),
          sortOrder: Number(sortOrder),
          isActive,
        },
      });

      setEditingCategory(null);
      resetForm();
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تعديل بيانات القسم.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      await deleteCategoryFn({
        data: { id: deletingCategory.id },
      });

      setDeletingCategory(null);
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل حذف القسم.");
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
            إدارة <span className="text-red-500">الأقسام الرئيسية</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            ترتيب وتفعيل الأقسام (بلايستيشن، ستريمينج، ألعاب، بطاقات) والتحكم
            بظهورها على المتجر
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && !showAddModal && !editingCategory && !deletingCategory && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/40 text-xs sm:text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Categories Table */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 overflow-hidden shadow-xl">
        <div className="divide-y divide-zinc-800/60">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/30 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400 shrink-0">
                  <FolderTree className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      {cat.label}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        cat.isActive
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      }`}
                    >
                      {cat.isActive ? "نشط بالمتجر" : "معطل"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                    <span className="font-mono text-zinc-500 text-[11px]">
                      {cat.id}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-zinc-300 font-medium">
                      <Package className="w-3 h-3 text-red-500" />
                      {cat.productCount} منتج مرتبط
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                <span className="text-xs text-zinc-500">
                  الترتيب:{" "}
                  <strong className="text-zinc-300 font-mono">
                    {cat.sortOrder}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="تعديل القسم"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setError(null);
                      setDeletingCategory(cat);
                    }}
                    className="p-2 rounded-lg border border-zinc-800 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                    title="حذف القسم"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY                                                */}
      {/* ========================================================================= */}
      {(showAddModal || editingCategory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h2 className="text-base font-bold text-white font-display">
                {editingCategory ? "تعديل القسم" : "إضافة قسم جديد"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCategory(null);
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

            <form
              onSubmit={editingCategory ? handleUpdate : handleCreate}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  اسم القسم بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="مثال: ألعاب بلايستيشن"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  المعرف الفريد (ID) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingCategory)}
                  value={id}
                  onChange={(e) => setId(e.target.value.toLowerCase())}
                  placeholder="playstation"
                  dir="ltr"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    الترتيب
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white text-center font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-800 text-red-600 bg-zinc-900"
                    />
                    <span>مفعل على المتجر</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>{editingCategory ? "حفظ التعديل" : "إضافة القسم"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CATEGORY CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">
                تأكيد حذف القسم
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف القسم{" "}
              <strong className="text-white">"{deletingCategory.label}"</strong>
              ؟
            </p>

            {deletingCategory.productCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/40 text-xs text-amber-300 leading-relaxed">
                ⚠️ يوجد حالياً{" "}
                <strong>{deletingCategory.productCount} منتج</strong> مرتبط بهذا
                القسم. يجب إعادة تعيين هذه المنتجات إلى قسم آخر أو حذفها قبل حذف
                القسم لحماية تكامل البيانات.
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={submitting || deletingCategory.productCount > 0}
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>نعم، حذف القسم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
