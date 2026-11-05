import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { checkAdminAuthFn, loginAdminFn } from "@/lib/api/admin.functions";
import { ADMIN_ACCESS_LOCKED } from "@/lib/admin-lock";
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    if (ADMIN_ACCESS_LOCKED) {
      throw redirect({
        to: "/",
      });
    }

    const auth = await checkAdminAuthFn();
    if (auth.authenticated) {
      throw redirect({
        to: "/admin",
      });
    }
  },
  component: AdminLogin,
});

function AdminLogin() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      await loginAdminFn({
        data: {
          code: accessCode.trim(),
        },
      });

      await router.invalidate();
      router.navigate({ to: "/admin" });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع أثناء تسجيل الدخول.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-red-600/30 selection:text-red-300"
    >
      {/* Background Neon Ambient Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-red-800/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-xl shadow-red-950/20 mb-4">
            <Shield className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-white">
            لوحة تحكم <span className="text-red-500">FLIX STORE</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            أدخل رمز الإدارة السري للوصول إلى إدارة المنتجات والأسعار
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-red-900/40 bg-red-950/30 p-3.5 text-xs sm:text-sm text-red-300">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="accessCode"
                className="block text-xs font-medium text-zinc-300 mb-2"
              >
                رمز الدخول (Access Code)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-zinc-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="accessCode"
                  type={showCode ? "text" : "password"}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 pr-10 pl-10 py-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showCode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-red-600/40 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-zinc-900 text-center">
            <p className="text-[11px] text-zinc-500">
              الدخول مقصور على مشرفي Flix Store المعتمدين. يتم تسجيل جميع
              المحاولات أمنياً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
