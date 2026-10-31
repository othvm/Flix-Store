import { useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getStorefrontDataFn } from "@/lib/api/storefront.functions";
import { Nav } from "@/components/flix/Nav";
import { Hero } from "@/components/flix/Hero";
import { WhyUs } from "@/components/flix/WhyUs";
import { Products } from "@/components/flix/Products";
import { Offers } from "@/components/flix/Offers";
import { ComingSoon } from "@/components/flix/ComingSoon";
import { HowItWorks } from "@/components/flix/HowItWorks";
import { Payments } from "@/components/flix/Payments";
import { Testimonials } from "@/components/flix/Testimonials";
import { Contact } from "@/components/flix/Contact";
import { Footer } from "@/components/flix/Footer";
import { StickyWA } from "@/components/flix/StickyWA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FLIX STORE | اشتراكات PlayStation Plus وألعاب PS4/PS5 في مصر" },
      {
        name: "description",
        content:
          "FLIX STORE — اشتراكات PlayStation Plus (Essential / Extra) وأحدث ألعاب PS4 و PS5 بأسعار Prim5 / Prim4 / Sec وتسليم فوري في مصر.",
      },
      {
        property: "og:title",
        content: "FLIX STORE | متجر الترفيه الرقمي الأول",
      },
      {
        property: "og:description",
        content: "اشتراكات PS Plus وعروض ألعاب PS4/PS5 بتسليم فوري ودعم 24/7.",
      },
    ],
  }),
  loader: async () => {
    return await getStorefrontDataFn();
  },
  component: Index,
});

function Index() {
  const data = Route.useLoaderData();

  return (
    <main className="relative">
      <Nav />
      {data.settings.announcement.active && data.settings.announcement.text && (
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white text-center py-2.5 px-4 text-xs sm:text-sm font-semibold sticky top-16 z-40 border-b border-red-500/30 shadow-lg shadow-red-950/40">
          📢 {data.settings.announcement.text}
        </div>
      )}
      <Hero />
      <WhyUs />
      <Products
        prices={data.psPlusPrices}
        availability={data.psPlusAvailability}
        settings={data.settings}
      />
      <Offers
        games={data.games}
        offers={data.offers}
        settings={data.settings}
      />
      <ComingSoon />
      <HowItWorks />
      <Payments settings={data.settings} />
      <Testimonials />
      <Contact settings={data.settings} />
      <Footer settings={data.settings} />
      <StickyWA settings={data.settings} />
    </main>
  );
}
