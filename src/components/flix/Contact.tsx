import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { WA_NUMBERS, waLink } from "@/lib/products";
import { Embers } from "./Embers";
import type { StorefrontData } from "@/lib/api/storefront.functions";

export function Contact({
  settings,
}: {
  settings?: StorefrontData["settings"];
}) {
  const primaryWa = settings?.contactInfo?.primaryWhatsapp || WA_NUMBERS[0];
  const orderDisplay =
    settings?.contactInfo?.displayOrderNumber || "01109664083";
  const paymentDisplay =
    settings?.contactInfo?.displayPaymentNumber || "01014956483";
  return (
    <section
      id="contact"
      className="relative py-28 px-4 sm:px-6 overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(204,0,0,0.25), transparent 60%)",
          }}
        />
      </div>
      <Embers count={25} />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-tight text-chrome"
        >
          جاهز تبدأ؟ احصل على اشتراكك الآن
        </motion.h2>
        <p className="text-xl text-white/70 mt-4">
          اختر منتجك، ادفع، واستقبل اشتراكك خلال دقائق
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-10 max-w-2xl mx-auto">
          <motion.a
            href={waLink(primaryWa, "مرحباً FLIX STORE، أريد الطلب الآن")}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative flex items-center justify-center gap-3 px-6 py-5 rounded-xl bg-green-600/10 border border-green-500/40 hover:bg-green-500 hover:border-green-400 transition-all"
          >
            <span className="relative">
              <MessageCircle className="w-7 h-7 text-green-400 group-hover:text-white" />
              <span className="absolute inset-0 rounded-full pulse-green" />
            </span>
            <span
              className="font-display text-lg sm:text-xl tracking-wider text-white"
              dir="ltr"
            >
              اطلب الآن — {orderDisplay} 💬
            </span>
          </motion.a>

          <motion.a
            href={waLink(primaryWa, "مرحباً FLIX STORE، استفسار بخصوص الدفع")}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group relative flex items-center justify-center gap-3 px-6 py-5 rounded-xl bg-green-600/10 border border-green-500/40 hover:bg-green-500 hover:border-green-400 transition-all"
          >
            <span className="relative">
              <MessageCircle className="w-7 h-7 text-green-400 group-hover:text-white" />
              <span className="absolute inset-0 rounded-full pulse-green" />
            </span>
            <span
              className="font-display text-lg sm:text-xl tracking-wider text-white"
              dir="ltr"
            >
              تواصل للدفع — {paymentDisplay} 💬
            </span>
          </motion.a>
        </div>

        <div className="mt-12 text-white/40 text-sm tracking-wider font-display">
          INSTAPAY · VODAFONE CASH · TELDA
        </div>
      </div>
    </section>
  );
}
