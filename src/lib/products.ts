export type Product = {
  id: string;
  name: string;
  service: string;
  category: "playstation" | "games";
  duration: string;
  price: number;
  popular?: boolean;
};

export const products: Product[] = [
  // PS Plus Standalone
  {
    id: "psp-ess-1m",
    name: "PS Plus Essential",
    service: "PlayStation",
    category: "playstation",
    duration: "شهر",
    price: 250,
  },
  {
    id: "psp-ess-3m",
    name: "PS Plus Essential",
    service: "PlayStation",
    category: "playstation",
    duration: "3 شهور",
    price: 680,
  },
  {
    id: "psp-ext-1m",
    name: "PS Plus Extra",
    service: "PlayStation",
    category: "playstation",
    duration: "شهر",
    price: 420,
    popular: true,
  },
  {
    id: "psp-ext-12m",
    name: "PS Plus Extra",
    service: "PlayStation",
    category: "playstation",
    duration: "سنة",
    price: 3900,
  },
  {
    id: "psp-prem-12m",
    name: "PS Plus Premium",
    service: "PlayStation",
    category: "playstation",
    duration: "سنة",
    price: 4800,
  },
];

export const categories = [
  { id: "all", label: "الكل" },
  { id: "playstation", label: "بلايستيشن" },
  { id: "games", label: "ألعاب" },
] as const;

export const WA_NUMBERS = ["201109664083", "201014956483"];
export const waLink = (num: string, msg?: string) =>
  `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
