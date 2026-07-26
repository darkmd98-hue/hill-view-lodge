import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET: Fetches the list of room units for a category and check-in date,
 * indicating which units are already booked.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const date = searchParams.get('date');

    if (!roomId || !date) {
      return NextResponse.json({ error: 'Missing roomId or date' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch all room units for this room type category
    const { data: units, error: unitsError } = await supabase
      .from('room_units')
      .select('id, room_number')
      .eq('room_type_id', roomId)
      .order('room_number', { ascending: true });

    if (unitsError) {
      console.error('Failed to fetch room units:', unitsError);
      return NextResponse.json({ error: unitsError.message }, { status: 500 });
    }

    // 2. Fetch all active bookings for this date and room category
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('room_unit_id')
      .eq('check_in', date)
      .neq('status', 'cancelled');

    if (bookingsError) {
      console.error('Failed to fetch bookings for date:', bookingsError);
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    const bookedUnitIds = new Set(bookings?.map((b) => b.room_unit_id) || []);

    // 3. Map units to include isOccupied status
    const mapped = (units || []).map((u) => ({
      id: u.id,
      room_number: u.room_number,
      isOccupied: bookedUnitIds.has(u.id),
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Failed to get available room units:', error);
    return NextResponse.json({ error: 'Failed to fetch available room units' }, { status: 500 });
  }
}
