-- Migration v6: Alternate Phone and Structured Address Fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pincode TEXT;
