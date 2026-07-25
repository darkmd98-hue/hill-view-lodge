-- ============================================================
-- Hill View Lodge — Supabase Migration v2
-- Run this script in your Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. ALTER EXISTING TABLES
-- ──────────────────────────────────────────────────────────────

-- Rooms table updates
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS thumbnail_image_url TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS occupancy_info TEXT DEFAULT '2 Adults, 1 Child';

-- Bookings table updates
-- We use DEFAULT CURRENT_DATE to ensure existing bookings don't fail, then we can drop the default constraint if desired
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- ──────────────────────────────────────────────────────────────
-- 2. CREATE NEW TABLES
-- ──────────────────────────────────────────────────────────────

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  joined_date  DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Site settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmap_link  TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. SEED ROOMS & SITE SETTINGS
-- ──────────────────────────────────────────────────────────────

-- Delete old seed rooms to avoid confusion
DELETE FROM rooms;

-- Insert the 6 real room types
INSERT INTO rooms (name, description, price_per_night, total_units, available_units, thumbnail_image_url, image_url, occupancy_info)
VALUES
  (
    'Deluxe Double Room Non A/C',
    'Comfortable double bedroom without air conditioning, featuring basic mountain view amenities.',
    2000.00, 5, 5,
    '/images/hero-interior.png', '/images/hero-interior.png',
    '2 Adults, 1 Child'
  ),
  (
    'Deluxe Double Room with A/C',
    'Charming double bedroom fully equipped with air conditioning for your complete comfort.',
    2800.00, 5, 5,
    '/images/hero-interior.png', '/images/hero-interior.png',
    '2 Adults, 1 Child'
  ),
  (
    'Luxury Triple Bed Room',
    'Spacious room offering three comfortable beds, premium styling, and valley vistas.',
    3500.00, 5, 5,
    '/images/hero-interior.png', '/images/hero-interior.png',
    '3 Adults, 1 Child'
  ),
  (
    'Suite Room',
    'Premium suite with separate lounge sitting area, elegant decor, and superior comfort.',
    4500.00, 5, 5,
    '/images/hero-interior.png', '/images/hero-interior.png',
    '2 Adults, 2 Children'
  ),
  (
    'One Bed Homestay',
    'Independent homestay experience featuring one bedroom, ideal for couples seeking privacy.',
    5000.00, 5, 5,
    '/images/hero-exterior.png', '/images/hero-exterior.png',
    '2 Adults, 2 Children'
  ),
  (
    'Two Bed Homestay',
    'Independent double-bedroom homestay perfect for small groups or families looking for a hillside escape.',
    8000.00, 5, 5,
    '/images/hero-exterior.png', '/images/hero-exterior.png',
    '4 Adults, 2 Children'
  );

-- Seed site settings if empty
INSERT INTO site_settings (gmap_link)
SELECT 'https://www.google.com/maps/search/?api=1&query=Hill+View+Lodge+Sringeri'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- ──────────────────────────────────────────────────────────────
-- 4. UPDATE RPC FUNCTION — create_booking
-- ──────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS create_booking(UUID, TEXT, TEXT, TEXT, TEXT, INT);

CREATE OR REPLACE FUNCTION create_booking(
  p_room_id          UUID,
  p_customer_name    TEXT,
  p_customer_phone   TEXT,
  p_customer_email   TEXT,
  p_customer_address TEXT,
  p_number_of_people  INT,
  p_check_in_date    DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available    INT;
  v_customer_id  UUID;
  v_booking_id   UUID;
  v_room_name    TEXT;
BEGIN
  -- 1. Check room availability (lock the row to prevent race conditions)
  SELECT available_units, name
    INTO v_available, v_room_name
    FROM rooms
   WHERE id = p_room_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Room not found.'
    );
  END IF;

  IF v_available <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This room type is currently full. Please choose another room.'
    );
  END IF;

  -- 2. Find or create customer by email
  SELECT id INTO v_customer_id
    FROM customers
   WHERE email = p_customer_email;

  IF NOT FOUND THEN
    INSERT INTO customers (name, phone, email, address)
    VALUES (p_customer_name, p_customer_phone, p_customer_email, p_customer_address)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update existing customer's info with the latest submission
    UPDATE customers
       SET name    = p_customer_name,
           phone   = p_customer_phone,
           address = p_customer_address
     WHERE id = v_customer_id;
  END IF;

  -- 3. Insert the booking with check_in_date
  INSERT INTO bookings (customer_id, room_id, number_of_people, check_in_date, status)
  VALUES (v_customer_id, p_room_id, p_number_of_people, p_check_in_date, 'pending')
  RETURNING id INTO v_booking_id;

  -- 4. Decrement available units
  UPDATE rooms
     SET available_units = available_units - 1
   WHERE id = p_room_id;

  -- 5. Return success
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'customer_id', v_customer_id,
    'room_name', v_room_name
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY & POLICIES
-- ──────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Staff: Block all public access (anon role has no policies, so it's fully denied)
CREATE POLICY "Deny all public access to staff"
  ON staff
  FOR ALL
  TO anon
  USING (false);

-- Site settings: Public SELECT access, rest denied
CREATE POLICY "Allow public read on site_settings"
  ON site_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Deny direct public write on site_settings"
  ON site_settings
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant execute permission on the updated RPC function to anon role
GRANT EXECUTE ON FUNCTION create_booking(UUID, TEXT, TEXT, TEXT, TEXT, INT, DATE) TO anon;
