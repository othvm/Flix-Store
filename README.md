# FLIX STORE 🎮

> **متجر الترفيه الرقمي الأول** — The premier digital subscription and gaming store in Egypt, specializing in PlayStation Plus memberships, PS4/PS5 games, and digital gift cards with instant delivery and secure local payment integrations.

---

## 🌟 Key Features

- **PlayStation Plus Subscriptions**: Dynamic tier selection (Essential, Extra) across multiple durations (1 Month, 3 Months, 12 Months) and slot types (Primary PS5, Primary PS4, Secondary).
- **Curated Games Catalog**: Live catalog of top titles (Grand Theft Auto VI, EA FC 26, Spider-Man, Dying Light, etc.) with real-time title and alias search.
- **Arabic-First UX & Motion**: RTL typography, cinematic dark aesthetic, animated embers, and fluid micro-interactions powered by Framer Motion.
- **Streamlined Purchase Flow**: Multi-step ordering modal with automated order formatting for WhatsApp dispatch and local Egyptian payment methods (Vodafone Cash, InstaPay, Telda).
- **Admin Management Portal (`/admin`)**:
  - **Overview**: Real-time sales metrics, product counts, and category breakdown.
  - **Products**: Manage games, editions, platform slots, pricing, and image assets.
  - **Categories**: Dynamic category management and sorting.
  - **Offers**: Manage seasonal discounts, countdown timers, and promotional badges.
  - **Settings**: Store announcement banner, WhatsApp routing numbers, and payment account configuration.
- **Resilient Zero-Downtime Architecture**: Automatic in-memory/seed catalog fallback ensuring 100% storefront availability even during database maintenance or network timeouts.

---

## 🛠 Tech Stack

| Domain                 | Technology                                                                                  |
| :--------------------- | :------------------------------------------------------------------------------------------ |
| **Framework**          | [TanStack Start](https://tanstack.com/start) (Full-stack React with SSR & Server Functions) |
| **Frontend**           | React 19, TypeScript, Tailwind CSS v4, Radix UI Primitives, Lucide Icons                    |
| **Routing**            | [TanStack Router](https://tanstack.com/router) (Type-safe file-based routing)               |
| **Animation**          | Framer Motion                                                                               |
| **Database & ORM**     | PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/), Supabase Storage                      |
| **Build & Serverless** | Vite 7, Nitro, Vercel Serverless Functions                                                  |

---

## 📂 Project Structure

```
├── drizzle/                # Database migrations and schema snapshots
├── src/
│   ├── assets/             # Static game artwork and brand assets
│   ├── components/
│   │   ├── flix/           # Storefront feature components (Hero, Nav, Offers, Products, PurchaseFlow)
│   │   └── ui/             # Radix-based design system primitives
│   ├── db/                 # Database connection, Drizzle schema, and seed catalog
│   ├── hooks/              # Custom React hooks
│   ├── lib/
│   │   ├── api/            # Server functions (storefront and admin operations)
│   │   ├── admin-lock.ts   # Administrative route guard configuration
│   │   ├── auth.server.ts  # Secure session authentication & rate limiting
│   │   ├── products.ts     # Static catalog definitions & WhatsApp helpers
│   │   └── storage.server.ts # Supabase Storage integration with magic-byte verification
│   ├── routes/             # TanStack Router file-based route definitions
│   │   ├── __root.tsx      # Application layout and global shell
│   │   ├── index.tsx       # Storefront home page
│   │   └── admin/          # Admin portal routes (login, overview, products, categories, settings)
│   ├── router.tsx          # Router instantiation and SSR configuration
│   ├── server.ts           # Server-side request handler and SSR error boundary
│   └── styles.css          # Global styles, fonts, and Tailwind utilities
├── .env.example            # Environment variables template
├── components.json         # UI component registry configuration
├── drizzle.config.ts       # Drizzle ORM configuration
├── eslint.config.js        # ESLint flat configuration
├── package.json            # Node.js dependencies and scripts
└── vite.config.ts          # Vite build and plugin configuration
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/othvm/Flix-Store.git
cd Flix-Store

# Install dependencies
npm install
```

### Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

```env
# Application Environment
NODE_ENV=development

# Postgres Database (e.g., Supabase or Neon)
DATABASE_URL="postgresql://user:password@localhost:5432/flix_store"

# Supabase Storage (Required for admin media uploads)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Admin Authentication
ADMIN_ACCESS_CODE="your-secure-admin-access-code"

# Admin Route Lockdown (set to "true" to temporarily lock admin routes)
ADMIN_ACCESS_LOCKED="false"
```

### Development

```bash
# Start local development server
npm run dev
```

Visit `http://localhost:3000` to preview the storefront.

---

## 🧪 Quality & Production Build

```bash
# Run ESLint
npm run lint

# Run TypeScript type check
npx tsc --noEmit

# Format codebase with Prettier
npm run format

# Compile production bundle for Vercel
npm run build
```

---

## 🔒 Security Best Practices

- **Zero Hardcoded Secrets**: All sensitive keys, connection strings, and administrative passwords are strictly accessed via environment variables.
- **Timing-Safe Authentication**: Admin credential verification utilizes `crypto.timingSafeEqual` with SHA-256 digests to prevent timing attacks.
- **Brute-Force Rate Limiting**: IP-based lockout mechanism guards `/admin/login` against brute-force attempts.
- **File Upload Security**: Uploaded images are validated via file magic bytes (MIME verification) with a 2MB maximum limit.
- **HMAC Signed Sessions**: Fallback cryptographic authentication ensures admin operational continuity.

---

## 📄 License

Private & Proprietary — All rights reserved.
