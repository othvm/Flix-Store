-- ============================================================================
-- FLIX STORE — Comprehensive Database Schema, RLS, Storage & Auth Migration
-- ============================================================================

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL, -- 'ps_plus' | 'game' | 'subscription' | 'gift_card'
  service TEXT,
  description TEXT,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  accent TEXT NOT NULL DEFAULT 'from-red-700 via-zinc-900 to-black',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_sort ON public.products(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  edition TEXT,
  duration TEXT,
  account_slot TEXT,
  denomination TEXT,
  price INTEGER NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_available ON public.product_variants(product_id, is_available);

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. OFFERS
CREATE TABLE IF NOT EXISTS public.offers (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge TEXT,
  discount_price INTEGER,
  original_price INTEGER,
  image_url TEXT,
  accent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_until TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active, sort_order);

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. STORE SETTINGS
CREATE TABLE IF NOT EXISTS public.store_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ADMIN SESSIONS (Server-side HMAC/Cookie session tracking)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_valid ON public.admin_sessions(id, is_valid, expires_at);

-- 8. ADMIN LOGIN ATTEMPTS (Brute-force mitigation)
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  ip TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  locked_until TIMESTAMPTZ,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. USER PROFILES (Integrated with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. ORDERS (Digital Storefront Orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- 'FL-xxxxxx'
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT,
  edition TEXT,
  duration TEXT,
  account_slot TEXT,
  platform TEXT,
  price INTEGER NOT NULL,
  payment_method TEXT NOT NULL, -- 'vodafone' | 'instapay' | 'telda'
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status, created_at DESC);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Helper function to check if current authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- CATEGORIES RLS
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Service role full access on categories"
  ON public.categories FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCTS RLS
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_active = TRUE OR public.is_admin());

CREATE POLICY "Service role full access on products"
  ON public.products FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PRODUCT VARIANTS RLS
CREATE POLICY "Public can view available variants"
  ON public.product_variants FOR SELECT
  USING (is_available = TRUE OR public.is_admin());

CREATE POLICY "Service role full access on product_variants"
  ON public.product_variants FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage product_variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- OFFERS RLS
CREATE POLICY "Public can view active offers"
  ON public.offers FOR SELECT
  USING (is_active = TRUE AND (valid_until IS NULL OR valid_until >= NOW()) OR public.is_admin());

CREATE POLICY "Service role full access on offers"
  ON public.offers FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage offers"
  ON public.offers FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- STORE SETTINGS RLS
CREATE POLICY "Public can view store settings"
  ON public.store_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role full access on store_settings"
  ON public.store_settings FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage store_settings"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PROFILES RLS
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ORDERS RLS
CREATE POLICY "Public can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Service role full access on orders"
  ON public.orders FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ADMIN SESSIONS & ATTEMPTS (Strictly service_role / server only)
CREATE POLICY "Service role only admin_sessions"
  ON public.admin_sessions FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role only admin_login_attempts"
  ON public.admin_login_attempts FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ============================================================================
-- STORAGE CONFIGURATION (catalog-images bucket)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog-images',
  'catalog-images',
  TRUE,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

-- Storage Object Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read catalog images'
  ) THEN
    CREATE POLICY "Public read catalog images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'catalog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Service role manage catalog images'
  ) THEN
    CREATE POLICY "Service role manage catalog images"
      ON storage.objects FOR ALL
      TO service_role
      USING (bucket_id = 'catalog-images')
      WITH CHECK (bucket_id = 'catalog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins upload catalog images'
  ) THEN
    CREATE POLICY "Admins upload catalog images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'catalog-images'
        AND public.is_admin()
      );
  END IF;
END $$;
