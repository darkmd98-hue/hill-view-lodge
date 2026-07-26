-- ============================================================
-- Hill View Lodge — Supabase Migration v4
-- Run this script in your Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create room_units table to track individual units
CREATE TABLE IF NOT EXISTS public.room_units (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  room_number  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on room_units
ALTER TABLE public.room_units ENABLE ROW LEVEL SECURITY;

-- Allow public read access to room_units
DROP POLICY IF EXISTS "Allow public read on room_units" ON public.room_units;
CREATE POLICY "Allow public read on room_units"
  ON public.room_units
  FOR SELECT
  TO anon
  USING (true);

-- 2. Seed room_units: insert 5 units for each existing room type
DO $$
DECLARE
  r RECORD;
  i INT;
BEGIN
  -- Clear existing units to avoid duplicates if rerun
  DELETE FROM public.room_units;
  
  FOR r IN SELECT id, name FROM public.rooms LOOP
    FOR i IN 1..5 LOOP
      INSERT INTO public.room_units (room_type_id, room_number)
      VALUES (r.id, r.name || ' - Room ' || (100 + i));
    END LOOP;
  END LOOP;
END $$;

-- 3. Add room_unit_id to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_unit_id UUID REFERENCES public.room_units(id) ON DELETE SET NULL;
