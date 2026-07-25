import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET: Lists all rooms.
 * PATCH: Updates a specific room's price or units.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('price_per_night', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { id, price_per_night, total_units, available_units } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const updates: Record<string, string | number> = {};
    if (price_per_night !== undefined) updates.price_per_night = price_per_night;
    if (total_units !== undefined) updates.total_units = total_units;
    if (available_units !== undefined) updates.available_units = available_units;

    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to patch room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
