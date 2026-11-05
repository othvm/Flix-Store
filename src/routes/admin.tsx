import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { checkAdminAuthFn, logoutAdminFn } from "@/lib/api/admin.functions";
import { ADMIN_ACCESS_LOCKED } from "@/lib/admin-lock";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    // If admin access is locked, redirect all /admin requests to the homepage
    if (ADMIN_ACCESS_LOCKED) {
      throw redirect({
        to: "/",
      });
    }

    // Never intercept the login route
    if (location.pathname === "/admin/login") {
      return;
    }

    const auth = await checkAdminAuthFn();
    if (!auth.authenticated) {
      throw redirect({
        to: "/admin/login",
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });
  const [loggingOut, setLoggingOut] = useState(false);

  // If viewing the login page, render without sidebar or admin shell
  if (currentPath === "/admin/login") {
    return <Outlet />;
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logoutAdminFn();
      await router.invalidate();
      router.navigate({ to: "/admin/login" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const navItems = [
    {
      to: "/admin",
      label: "لوحة التحكم",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      to: "/admin/products",
      label: "المنتجات والأسعار",
      icon: Package,
    },
    {
      to: "/admin/categories",
      label: "الأقسام",
      icon: FolderTree,
    },
    {
      to: "/admin/offers",
      label: "العروض والبانرات",
      icon: Tag,
    },
    {
      to: "/admin/settings",
      label: "إعدادات المتجر",
      icon: Settings,
    },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#080808] text-zinc-100 flex flex-col font-sans selection:bg-red-600/30 selection:text-red-300"
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-black/60 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex items-center gap-2 font-display text-xl tracking-wider"
              dir="ltr"
            >
              <span className="font-bold text-white">FLIX</span>
              <span className="font-bold text-red-500">CMS</span>
            </Link>
            <span className="hidden sm:inline-block rounded-full bg-red-950/60 border border-red-800/40 px-2.5 py-0.5 text-xs text-red-400 font-medium">
              لوحة الإدارة الرسمية
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800"
            >
              <Store className="h-3.5 w-3.5" />
              <span>زيارة المتجر</span>
              <ExternalLink className="h-3 w-3 text-zinc-500" />
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/50 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{loggingOut ? "جاري الخروج..." : "خروج"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-l border-zinc-800/80 bg-zinc-950/40 p-4 shrink-0">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? currentPath === item.to
                : currentPath.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20 font-semibold"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-zinc-900">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>جلسة آمنة ومحمية</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                قاعدة البيانات متصلة عبر Supabase PostgreSQL، ويتم التحقق من
                الجلسات على الخادم.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
