-- ============================================================
-- Hill View Lodge — Supabase Migration v3 (Auth & Payments)
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. CLEANUP OLD BOOKINGS & PAYMENTS
-- ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 2. CREATE PROFILES TABLE (Linked 1:1 with auth.users)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  date_of_birth DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. CREATE BOOKINGS TABLE (Linked to profiles)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_type        TEXT NOT NULL, -- 'room' | 'adventure'
  room_or_activity_id UUID NOT NULL,
  check_in            DATE NOT NULL,
  check_out           DATE,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT DEFAULT 'INR',
  status              TEXT DEFAULT 'pending', -- pending | confirmed | cancelled
  created_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- ──────────────────────────────────────────────────────────────
-- 4. CREATE PAYMENTS TABLE (Linked to bookings)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  razorpay_order_id   TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  amount              NUMERIC(10,2) NOT NULL,
  status              TEXT DEFAULT 'created', -- created | paid | failed
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ── Profiles Policies ──
CREATE POLICY "Allow select own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow insert profiles during registration"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- ── Bookings Policies ──
CREATE POLICY "Allow select own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Payments Policies ──
CREATE POLICY "Allow select own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow insert own payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow update own payments"
  ON public.payments FOR UPDATE
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()
    )
  );
