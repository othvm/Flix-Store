import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getAdminSettingsFn,
  updateStoreSettingsFn,
} from "@/lib/api/admin.functions";
import {
  Settings,
  Phone,
  CreditCard,
  Bell,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/settings")({
  loader: async () => {
    return await getAdminSettingsFn();
  },
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const router = useRouter();
  const settings = Route.useLoaderData();

  // Contact Info state
  const [primaryWhatsapp, setPrimaryWhatsapp] = useState(
    settings.contactInfo.primary_whatsapp ||
      settings.contactInfo.primaryWhatsapp ||
      "201109664083",
  );
  const [displayOrderNumber, setDisplayOrderNumber] = useState(
    settings.contactInfo.display_order_number ||
      settings.contactInfo.displayOrderNumber ||
      "01109664083",
  );
  const [displayPaymentNumber, setDisplayPaymentNumber] = useState(
    settings.contactInfo.display_payment_number ||
      settings.contactInfo.displayPaymentNumber ||
      "01014956483",
  );
  const [supportHours, setSupportHours] = useState(
    settings.contactInfo.support_hours ||
      settings.contactInfo.supportHours ||
      "24/7 على مدار الساعة",
  );

  // Payment Accounts state
  const [vodafoneCash, setVodafoneCash] = useState(
    settings.paymentAccounts.vodafone_cash ||
      settings.paymentAccounts.vodafoneCash ||
      "01109664083",
  );
  const [instapay, setInstapay] = useState(
    settings.paymentAccounts.instapay || "01014956483",
  );
  const [telda, setTelda] = useState(
    settings.paymentAccounts.telda || "@flix90",
  );

  // Announcement state
  const [announcementActive, setAnnouncementActive] = useState<boolean>(
    Boolean(settings.announcement.active),
  );
  const [announcementText, setAnnouncementText] = useState(
    settings.announcement.text || "",
  );

  // Loading & Feedback
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveSettings = async (
    key: "contact_info" | "payment_accounts" | "announcement",
    value: Record<string, unknown>,
  ) => {
    try {
      setSavingKey(key);
      setError(null);

      await updateStoreSettingsFn({
        data: {
          key,
          value,
        },
      });

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
      await router.invalidate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "حدث خطأ أثناء حفظ الإعدادات.",
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
          إعدادات <span className="text-red-500">المتجر وواتساب</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
          تحكم بأرقام واتساب للشراء، طرق الدفع والتحويل، وشريط الإعلانات
          التنبيهية على واجهة المتجر
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-900/40 text-xs sm:text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Contact & WhatsApp Settings */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-950/50 border border-green-800/40 text-green-400 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                أرقام التواصل وواتساب (WhatsApp & Support)
              </h2>
              <p className="text-xs text-zinc-400">
                الأرقام المستخدمة في أزرار "اطلب الآن" وروابط المحادثة المباشرة
              </p>
            </div>
          </div>

          {savedKey === "contact_info" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              رقم واتساب الأساسي للشراء (بالكود الدولي) *
            </label>
            <input
              type="text"
              required
              value={primaryWhatsapp}
              onChange={(e) => setPrimaryWhatsapp(e.target.value)}
              placeholder="201109664083"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              يبدأ بكود الدولة دون علامة + (مثال: 201109664083)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              رقم الهاتف المعروض للطلبات *
            </label>
            <input
              type="text"
              required
              value={displayOrderNumber}
              onChange={(e) => setDisplayOrderNumber(e.target.value)}
              placeholder="01109664083"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              رقم الهاتف المعروض للاستفسارات والدفع
            </label>
            <input
              type="text"
              value={displayPaymentNumber}
              onChange={(e) => setDisplayPaymentNumber(e.target.value)}
              placeholder="01014956483"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              أوقات الدعم وخدمة العملاء
            </label>
            <input
              type="text"
              value={supportHours}
              onChange={(e) => setSupportHours(e.target.value)}
              placeholder="24/7 على مدار الساعة"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={savingKey === "contact_info"}
            onClick={() =>
              saveSettings("contact_info", {
                primary_whatsapp: primaryWhatsapp.trim(),
                display_order_number: displayOrderNumber.trim(),
                display_payment_number: displayPaymentNumber.trim(),
                support_hours: supportHours.trim(),
              })
            }
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            {savingKey === "contact_info" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ بيانات التواصل</span>
          </button>
        </div>
      </div>

      {/* 2. Payment Accounts Settings */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/50 border border-blue-800/40 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                حسابات الدفع والتحويل (Payment Accounts)
              </h2>
              <p className="text-xs text-zinc-400">
                المحافظ والحسابات المعروضة للعميل في نافذة إتمام الطلب للنسخ
                والتحويل
              </p>
            </div>
          </div>

          {savedKey === "payment_accounts" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              رقم فودافون كاش *
            </label>
            <input
              type="text"
              required
              value={vodafoneCash}
              onChange={(e) => setVodafoneCash(e.target.value)}
              placeholder="01109664083"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              حساب / رقم إنستاباي (InstaPay) *
            </label>
            <input
              type="text"
              required
              value={instapay}
              onChange={(e) => setInstapay(e.target.value)}
              placeholder="01014956483 أو username@instapay"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              حساب تيلدا (Telda)
            </label>
            <input
              type="text"
              value={telda}
              onChange={(e) => setTelda(e.target.value)}
              placeholder="@flix90"
              dir="ltr"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={savingKey === "payment_accounts"}
            onClick={() =>
              saveSettings("payment_accounts", {
                vodafone_cash: vodafoneCash.trim(),
                instapay: instapay.trim(),
                telda: telda.trim(),
              })
            }
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            {savingKey === "payment_accounts" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ بيانات الدفع</span>
          </button>
        </div>
      </div>

      {/* 3. Announcement Banner Settings */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/50 border border-amber-800/40 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                شريط الإعلانات التنبيهي (Store Announcement Banner)
              </h2>
              <p className="text-xs text-zinc-400">
                شريط أحمر يظهر أعلى المتجر للإعلان عن عروض موسمية أو تنبيهات
                هامة للعملاء
              </p>
            </div>
          </div>

          {savedKey === "announcement" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" /> تم الحفظ بنجاح
            </span>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-800 text-red-600 bg-zinc-900"
            />
            <span className="font-semibold text-white">
              تفعيل الشريط الإعلاني على المتجر
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              نص الإعلان (يظهر لجميع الزوار أعلى الصفحة)
            </label>
            <input
              type="text"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="مثال: 🔥 عروض الصيف بدأت الآن! خصم 20% على باقات PS Plus Extra السنوية لفترة محدودة"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {announcementActive && announcementText && (
            <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-900/40 text-xs text-white flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-600 text-[10px] font-bold">
                معاينة:
              </span>
              <span>📢 {announcementText}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={savingKey === "announcement"}
            onClick={() =>
              saveSettings("announcement", {
                active: announcementActive,
                text: announcementText.trim(),
              })
            }
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            {savingKey === "announcement" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>حفظ إعدادات الإعلان</span>
          </button>
        </div>
      </div>
    </div>
  );
}
