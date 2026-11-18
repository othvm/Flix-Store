import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { StorefrontData } from "@/lib/api/storefront.functions";

export function Payments({ settings }: { settings?: StorefrontData["settings"] }) {
  const extractString = (val: unknown, fallback: string): string => {
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (typeof val === "object" && val !== null) {
      const obj = val as Record<string, unknown>;
      if (typeof obj.number === "string" && obj.number.trim().length > 0) return obj.number.trim();
      if (typeof obj.id === "string" && obj.id.trim().length > 0) return obj.id.trim();
      if (typeof obj.value === "string" && obj.value.trim().length > 0) return obj.value.trim();
    }
    return fallback;
  };

  const methods = [
    {
      name: "InstaPay",
      sub: "تحويل فوري عبر التطبيق",
      detail: extractString(settings?.paymentAccounts?.instapay, "01014956483"),
    },
    {
      name: "Vodafone Cash",
      sub: "محفظة فودافون كاش",
      detail: extractString(settings?.paymentAccounts?.vodafoneCash, "01109664083"),
    },
    {
      name: "Telda",
      sub: "كارت تيلدا المالي",
      detail: extractString(settings?.paymentAccounts?.telda, "@flix90"),
    },
  ];

  return (
    <section className="relative py-20 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-10">
          <span className="text-red-400 text-sm tracking-[0.3em] font-display">— طرق الدفع —</span>
          <h2 className="section-heading text-chrome mt-2">ادفع بسهولة</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {methods.map((m, i) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card-flix p-6 text-center"
            >
              <div className="font-display text-xl text-white tracking-wide">{m.name}</div>
              <div className="text-xs text-white/50 mt-1">{m.sub}</div>
              <div className="mt-3 font-mono text-xs sm:text-sm text-red-300 font-bold tracking-wider px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 inline-block">
                {m.detail}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/50">
          <Lock className="w-4 h-4 text-green-400" />
          جميع المدفوعات آمنة ومحمية بالكامل
        </div>
      </div>
    </section>
  );
}
