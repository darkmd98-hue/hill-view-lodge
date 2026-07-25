import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET: Lists all bookings joined with customer and room details.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        number_of_people,
        status,
        check_in_date,
        created_at,
        customers (
          name,
          phone,
          email,
          address
        ),
        rooms (
          name,
          price_per_night
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
