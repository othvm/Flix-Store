import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getAdminOverviewFn } from "@/lib/api/admin.functions";
import {
  Package,
  FolderTree,
  Tag,
  Settings,
  ArrowUpRight,
  Database,
  HardDrive,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    return await getAdminOverviewFn();
  },
  component: AdminDashboardOverview,
});

function AdminDashboardOverview() {
  const router = useRouter();
  const stats = Route.useLoaderData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await router.invalidate();
    setRefreshing(false);
  };

  const statCards = [
    {
      title: "إجمالي المنتجات",
      value: stats.totalProducts,
      subValue: `${stats.activeProducts} معروض · ${stats.inactiveProducts} مخفي`,
      icon: Package,
      color: "from-blue-600/20 to-blue-900/10",
      borderColor: "border-blue-800/30",
      textColor: "text-blue-400",
      link: "/admin/products",
    },
    {
      title: "الأقسام المتاحة",
      value: stats.totalCategories,
      subValue: "أقسام المتجر الرئيسية النشطة",
      icon: FolderTree,
      color: "from-purple-600/20 to-purple-900/10",
      borderColor: "border-purple-800/30",
      textColor: "text-purple-400",
      link: "/admin/categories",
    },
    {
      title: "باقات وأسعار المنتجات",
      value: stats.totalVariants,
      subValue: `${stats.activeVariants} متاح · ${stats.unavailableVariants} نفد المخزون`,
      icon: Layers,
      color: "from-emerald-600/20 to-emerald-900/10",
      borderColor: "border-emerald-800/30",
      textColor: "text-emerald-400",
      link: "/admin/products",
    },
    {
      title: "العروض والبانرات",
      value: stats.totalOffers,
      subValue: `${stats.activeOffers} عروض ترويجية نشطة`,
      icon: Sparkles,
      color: "from-red-600/20 to-red-900/10",
      borderColor: "border-red-800/30",
      textColor: "text-red-400",
      link: "/admin/offers",
    },
  ];

  const quickLinks = [
    {
      title: "إدارة المنتجات والأسعار",
      description:
        "إضافة وتعديل ألعاب PlayStation، اشتراكات PS Plus، فئات البطاقات والتحكم بالتوفر فورياً.",
      to: "/admin/products",
      icon: Package,
      badge: `${stats.totalProducts} منتج`,
    },
    {
      title: "إدارة الأقسام والترتيب",
      description:
        "ترتيب الأقسام الرئيسية وتسمياتها وحالة ظهورها على واجهة المتجر.",
      to: "/admin/categories",
      icon: FolderTree,
      badge: `${stats.totalCategories} أقسام`,
    },
    {
      title: "العروض الترويجية والبانرات",
      description:
        "إنشاء عروض ترويجية بخصومات محددة وربطها بالمنتجات مع تحديد تاريخ الانتهاء.",
      to: "/admin/offers",
      icon: Tag,
      badge: `${stats.activeOffers} نشط`,
    },
    {
      title: "إعدادات المتجر وبيانات الدفع",
      description:
        "تعديل أرقام واتساب للطلبات، محافظ فودافون كاش وإنستاباي، وشريط الإعلانات.",
      to: "/admin/settings",
      icon: Settings,
      badge: "بيانات حية",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Live Status Header */}
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-l from-red-950/20 via-zinc-900/40 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/50 border border-red-900/40 text-xs text-red-400 mb-2 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>لوحة إدارة المحتوى الرسمية (Live Store CMS)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
              مرحباً بك في لوحة تحكم{" "}
              <span className="text-red-500">FLIX STORE</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              تحكم بجميع محتويات المتجر، الأسعار، العروض، وأرقام التواصل في
              الوقت الفعلي. تنعكس جميع التعديلات مباشرة على واجهة العملاء دون
              الحاجة لإعادة نشر الكود.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>تحديث البيانات</span>
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3.5 py-2 text-xs text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>متصل بـ Supabase</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className={`rounded-xl border ${card.borderColor} bg-gradient-to-br ${card.color} bg-zinc-950/80 p-5 backdrop-blur-sm transition-all hover:border-zinc-700 block group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition">
                  {card.title}
                </span>
                <div
                  className={`w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-center ${card.textColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold tracking-tight text-white mb-1">
                {card.value}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                {card.subValue}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Categories Distribution & Recent Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categories Distribution */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-purple-400" />
              <span>توزيع المنتجات حسب الأقسام</span>
            </h3>
            <Link
              to="/admin/categories"
              className="text-[11px] text-zinc-400 hover:text-white"
            >
              إدارة الأقسام ←
            </Link>
          </div>
          <div className="space-y-3">
            {stats.categoryDistribution.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs"
              >
                <span className="font-medium text-zinc-200">{cat.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                  {cat.count} منتج
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Updated Products */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>أحدث المنتجات المعدلة في المتجر</span>
            </h3>
            <Link
              to="/admin/products"
              className="text-[11px] text-zinc-400 hover:text-white"
            >
              عرض الكل ({stats.totalProducts}) ←
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.recentProducts.map((p) => (
              <Link
                key={p.id}
                to="/admin/products"
                className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 hover:border-zinc-700 transition flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {p.category || "عام"}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.isActive
                        ? "bg-emerald-950/60 border border-emerald-900/40 text-emerald-400"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {p.isActive ? "معروض" : "مخفي"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main CMS Management Sections */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          أقسام لوحة الإدارة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white group-hover:text-red-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                        {item.badge}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Infrastructure Details */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          البنية التحتية وحالة الاتصال المباشر (Infrastructure & Storage)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">
                Supabase PostgreSQL 17
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Pooler: aws-0-eu-west-1 (Port 6543)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">Supabase Storage</div>
              <div className="text-[11px] text-zinc-400">
                دلو catalog-images (JPEG/PNG/WebP 2MB)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/40">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">جلسات الإدارة</div>
              <div className="text-[11px] text-zinc-400">
                جلسات قاعدة بيانات مشفرة مع قفل Brute-Force
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
