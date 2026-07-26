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

/**
 * POST: Creates a brand-new room category and seeds its initial room units.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const {
      name,
      description,
      price_per_night,
      occupancy_info,
      thumbnail_image_url,
      image_url,
      initial_units_count = 5,
    } = await request.json();

    if (!name || price_per_night === undefined) {
      return NextResponse.json({ error: 'Name and price_per_night are required' }, { status: 400 });
    }

    // 1. Insert new room category
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name,
        description: description || null,
        price_per_night: Number(price_per_night),
        available_units: Number(initial_units_count),
        total_units: Number(initial_units_count),
        occupancy_info: occupancy_info || '2 Adults, 1 Child',
        thumbnail_image_url: thumbnail_image_url || '/images/hero-interior.png',
        image_url: image_url || '/images/hero-interior.png',
      })
      .select()
      .single();

    if (roomError || !room) {
      console.error('Failed to create room category:', roomError);
      return NextResponse.json({ error: roomError?.message || 'Failed to create room' }, { status: 500 });
    }

    // 2. Seed initial room units
    const unitsCount = Math.max(1, Number(initial_units_count) || 5);
    const unitRows = Array.from({ length: unitsCount }, (_, i) => ({
      room_type_id: room.id,
      room_number: `${name} - Room ${101 + i}`,
      status: 'active',
    }));

    const { error: unitsError } = await supabase.from('room_units').insert(unitRows);
    if (unitsError) {
      console.warn('Failed to seed room_units for new category:', unitsError);
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json({ error: 'Failed to create room category' }, { status: 500 });
  }
}
