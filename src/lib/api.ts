import { getSupabase } from './supabaseClient';
import type { BookingFormData, Room, BookingResult } from './types';

/**
 * Fetches the list of rooms from Supabase (client-side).
 * Rooms table has public read access via RLS.
 */
export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('id, name, description, price_per_night, available_units, thumbnail_image_url, image_url, occupancy_info')
    .order('price_per_night', { ascending: true });

  if (error) {
    console.error('Failed to fetch rooms:', error);
    throw new Error('Unable to load rooms. Please try again later.');
  }

  return data ?? [];
}

/**
 * Submits a booking by calling the server-side API route.
 * The API route handles the Supabase RPC + Resend notifications.
 */
export async function submitBooking(
  formData: BookingFormData
): Promise<BookingResult> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: formData.customerName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        numberOfPeople: formData.numberOfPeople,
        selectedRoom: formData.selectedRoom,
        customerEmail: formData.customerEmail,
        checkInDate: formData.checkInDate,
        token,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Booking failed. Please try again.',
      };
    }

    return {
      success: true,
      bookingId: data.bookingId,
      customerId: data.customerId ?? '',
      roomName: data.roomName,
    };
  } catch (err) {
    console.error('Booking request failed:', err);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.',
    };
  }
}
