-- =========================================================
-- Migration v7: Occupancy Pricing, Extra Guests & Invoicing
-- =========================================================

-- 1. Add occupancy limit columns to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS base_adults INT NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS base_children INT NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_extra_adults INT NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_extra_children INT NOT NULL DEFAULT 2;

-- 2. Add extra guest counts to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS extra_adults INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_children INT NOT NULL DEFAULT 0;

-- 3. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_rate_total NUMERIC(10, 2) NOT NULL,
  extra_adults_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  extra_children_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(10, 2) NOT NULL,
  gst_rate NUMERIC(4, 2) NOT NULL DEFAULT 5.00,
  gst_amount NUMERIC(10, 2) NOT NULL,
  grand_total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by booking_id
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);

-- 4. Enable Row Level Security (RLS) on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own booking invoices
CREATE POLICY "Users can view own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = invoices.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- Policy: Service role has full access to invoices
CREATE POLICY "Service role full access on invoices"
  ON public.invoices
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
