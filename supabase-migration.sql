-- ============================================================
-- Coastal Haven Lodge — Supabase Migration
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABLES
-- ──────────────────────────────────────────────────────────────

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  description    TEXT,
  price_per_night NUMERIC(10,2) NOT NULL,
  total_units    INT NOT NULL,
  available_units INT NOT NULL,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT NOT NULL,
  address    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index on email to support upsert logic
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_idx ON customers (email);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  room_id          UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  number_of_people INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'))
);

-- ──────────────────────────────────────────────────────────────
-- 2. SEED DATA (rooms)
-- ──────────────────────────────────────────────────────────────

INSERT INTO rooms (name, description, price_per_night, total_units, available_units)
VALUES
  (
    'Standard Room',
    'A comfortable room with all essential amenities for a relaxing stay.',
    2500.00, 5, 5
  ),
  (
    'Deluxe Room',
    'Spacious room with premium furnishings and a beautiful garden view.',
    4500.00, 5, 5
  ),
  (
    'Family Suite',
    'A large suite perfect for families, featuring a living area and two bedrooms.',
    7000.00, 5, 5
  ),
  (
    'Sea View Room',
    'Wake up to stunning ocean views from your private balcony.',
    9000.00, 5, 5
  )
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 3. RPC FUNCTION — create_booking
-- ──────────────────────────────────────────────────────────────
-- SECURITY DEFINER: runs with the owner's permissions,
-- bypassing RLS so it can insert into customers/bookings
-- even though anon users have no direct access.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_booking(
  p_room_id         UUID,
  p_customer_name   TEXT,
  p_customer_phone  TEXT,
  p_customer_email  TEXT,
  p_customer_address TEXT,
  p_number_of_people INT
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

  -- 3. Insert the booking
  INSERT INTO bookings (customer_id, room_id, number_of_people, status)
  VALUES (v_customer_id, p_room_id, p_number_of_people, 'pending')
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
-- 4. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Rooms: allow public read access (for fetching room list + prices)
CREATE POLICY "Allow public read on rooms"
  ON rooms
  FOR SELECT
  TO anon
  USING (true);

-- Customers: no direct public access
-- (create_booking function uses SECURITY DEFINER to bypass RLS)
CREATE POLICY "Deny all direct access to customers"
  ON customers
  FOR ALL
  TO anon
  USING (false);

-- Bookings: no direct public access
-- (create_booking function uses SECURITY DEFINER to bypass RLS)
CREATE POLICY "Deny all direct access to bookings"
  ON bookings
  FOR ALL
  TO anon
  USING (false);

-- Grant execute permission on the RPC function to anon role
GRANT EXECUTE ON FUNCTION create_booking TO anon;
