import type { InvoiceBreakdown } from './pricing';

// ── Room (from Supabase) ──

export interface Room {
  id: string;
  name: string;
  description: string | null;
  price_per_night: number;
  available_units: number;
  total_units?: number;
  thumbnail_image_url?: string;
  image_url?: string;
  occupancy_info?: string;
  base_adults?: number;
  base_children?: number;
  max_extra_adults?: number;
  max_extra_children?: number;
}

// ── Booking Form ──

export interface BookingFormData {
  customerName: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  numberOfPeople: number;
  selectedRoom: string; // room UUID from Supabase
  customerEmail: string;
  checkInDate: string; // YYYY-MM-DD format
  roomUnitId?: string;  // individual room unit UUID
  extraAdults?: number;
  extraChildren?: number;
}

// ── Booking Result (from create_booking RPC) ──

export type BookingResult =
  | {
      success: true;
      bookingId: string;
      customerId: string;
      roomName: string;
      paymentRequired?: boolean;
      orderId?: string;
      razorpayKeyId?: string;
      invoice?: InvoiceBreakdown;
    }
  | { success: false; error: string };

// ── Booking Context Data (passed to confirmation page) ──

export interface BookingConfirmation {
  customerName: string;
  customerEmail: string;
  roomName: string;
  numberOfPeople: number;
  bookingId: string;
  checkInDate: string;
  roomNumber?: string;
  extraAdults?: number;
  extraChildren?: number;
  invoice?: InvoiceBreakdown;
}

// ── Navigation ──

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Rooms', href: '/rooms-booking' },
  { label: 'Adventures', href: '/adventure-booking' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
];
