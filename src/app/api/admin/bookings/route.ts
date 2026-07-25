import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

interface DBBooking {
  id: string;
  status: string;
  check_in: string;
  check_out: string | null;
  amount: number;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    phone: string | null;
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
        profiles (
          id,
          full_name,
          phone
        ),
        room_or_activity_id
      `)
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Failed to query bookings:', bookingsError);
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
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

    // 4. Map to frontend friendly shape matching the new profiles RLS consolidation
    const mapped = (bookings as unknown as DBBooking[] || []).map((b) => {
      const room = roomsMap.get(b.room_or_activity_id);
      const authUser = b.profiles?.id ? usersMap.get(b.profiles.id) : undefined;

      return {
        id: b.id,
        number_of_people: 1, // default guest count
        status: b.status,
        check_in_date: b.check_in,
        created_at: b.created_at,
        profiles: b.profiles
          ? {
              full_name: b.profiles.full_name,
              phone: b.profiles.phone || '',
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
