-- Migration v5: Database Cleanup and Seeding
-- 1. Create temporary references or variables for cleanup
DO $$
DECLARE
  surviving_id UUID;
  r RECORD;
  i INT;
BEGIN
  -- We want to clean up duplicate room types and keep exactly one surviving row for each category:
  -- Deluxe Double Room Non A/C, Deluxe Double Room with A/C, Luxury Triple Bed Room, One Bed Homestay, Suite Room, Two Bed Homestay
  
  -- For each unique category name, find the ID of the row we want to keep
  -- We will keep the row with the max ID or the one with the correct price (₹2500 for Deluxe Double Room Non A/C)
  
  -- Reassign bookings and delete duplicate rooms:
  FOR r IN (
    SELECT DISTINCT name FROM public.rooms
  ) LOOP
    -- Select the surviving ID (prioritizing price 2500 if name is 'Deluxe Double Room Non A/C')
    IF r.name = 'Deluxe Double Room Non A/C' THEN
      SELECT id INTO surviving_id FROM public.rooms WHERE name = r.name ORDER BY (CASE WHEN price_per_night = 2500 THEN 1 ELSE 2 END) ASC, id LIMIT 1;
    ELSE
      SELECT id INTO surviving_id FROM public.rooms WHERE name = r.name ORDER BY id LIMIT 1;
    END IF;

    -- Update price to intended value for the surviving row
    IF r.name = 'Deluxe Double Room Non A/C' THEN
      UPDATE public.rooms SET price_per_night = 2500 WHERE id = surviving_id;
    END IF;

    -- Reassign any bookings referencing duplicate rooms of this category
    UPDATE public.bookings SET room_or_activity_id = surviving_id WHERE room_or_activity_id IN (
      SELECT id FROM public.rooms WHERE name = r.name AND id <> surviving_id
    );

    -- Delete duplicate room records
    DELETE FROM public.rooms WHERE name = r.name AND id <> surviving_id;
  END LOOP;

  -- 2. Clean and re-seed room units for the 6 surviving categories (5 units each)
  DELETE FROM public.room_units;
  
  FOR r IN SELECT id, name FROM public.rooms LOOP
    FOR i IN 1..5 LOOP
      INSERT INTO public.room_units (room_type_id, room_number, status)
      VALUES (r.id, r.name || ' - Room ' || (100 + i), 'active');
    END LOOP;
  END LOOP;
  
END $$;
