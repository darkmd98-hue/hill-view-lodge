import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface DBBooking {
  id: string;
  status: string;
  check_in: string;
  check_out: string | null;
  amount: number;
  created_at: string;
  alternate_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  room_unit_id: string | null;
  profiles: {
    id: string;
    full_name: string;
    phone: string | null;
    alternate_phone?: string | null;
  } | null;
  room_or_activity_id: string;
}

/**
 * GET: Lists all bookings joined with profile and room details.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Fetch bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        check_in,
        check_out,
        amount,
        created_at,
        alternate_phone,
        street_address,
        city,
        state,
        pincode,
        room_unit_id,
        profiles (
          id,
          full_name,
          phone,
          alternate_phone
        ),
        room_or_activity_id
      `)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Failed to query bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings.' }, { status: 500 });
    }

    // 2. Fetch rooms to map room names
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, price_per_night');

    const roomsMap = new Map(rooms?.map((r) => [r.id, r]) || []);

    // 3. Fetch all auth users to match emails in-memory
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error('Failed to list auth users:', usersError);
    }
    const usersMap = new Map(users?.map((u) => [u.id, u]) || []);

    // 4. Fetch room units to map room numbers
    const { data: roomUnits } = await supabase
      .from('room_units')
      .select('id, room_number');
    const unitsMap = new Map(roomUnits?.map((u) => [u.id, u.room_number]) || []);

    // 5. Map to frontend friendly shape
    const mapped = (bookings as unknown as DBBooking[] || []).map((b) => {
      const room = roomsMap.get(b.room_or_activity_id);
      const authUser = b.profiles?.id ? usersMap.get(b.profiles.id) : undefined;
      const roomNumber = b.room_unit_id ? unitsMap.get(b.room_unit_id) || '' : '';
      const fullAddress = b.street_address ? `${b.street_address}, ${b.city || ''}, ${b.state || ''} - ${b.pincode || ''}` : '';

      return {
        id: b.id,
        status: b.status,
        check_in_date: b.check_in,
        created_at: b.created_at,
        amount: b.amount,
        address: fullAddress,
        alternate_phone: b.alternate_phone || b.profiles?.alternate_phone || '',
        street_address: b.street_address || '',
        city: b.city || '',
        state: b.state || '',
        pincode: b.pincode || '',
        room_number: roomNumber,
        profiles: b.profiles
          ? {
              full_name: b.profiles.full_name,
              phone: b.profiles.phone || '',
              alternate_phone: b.alternate_phone || b.profiles.alternate_phone || '',
              email: authUser?.email || '',
            }
          : null,
        rooms: room
          ? {
              name: room.name,
              price_per_night: room.price_per_night,
            }
          : {
              name: 'Unknown Category',
              price_per_night: b.amount,
            },
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

/**
 * DELETE: Permanently removes a booking and its associated payment records.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(request.url);
    let bookingId = url.searchParams.get('id');

    if (!bookingId) {
      try {
        const body = await request.json();
        bookingId = body.bookingId || body.id;
      } catch {
        // Body reading error fallback
      }
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // 1. Delete associated payment records
    await supabase.from('payments').delete().eq('booking_id', bookingId);

    // 2. Delete the booking record
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);

    if (error) {
      console.error('Failed to delete booking:', error);
      return NextResponse.json({ error: 'Failed to delete booking record.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}
