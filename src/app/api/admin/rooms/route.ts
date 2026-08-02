import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidPositiveNumber, isValidNonNegativeInt, isValidString, VALIDATION_LIMITS } from '@/lib/validation';

/**
 * GET: Lists all rooms.
 * PATCH: Updates a specific room's price or units.
 * POST: Creates a new room category and seeds initial units.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('price_per_night', { ascending: true });

    if (error) {
      console.error('Failed to fetch rooms:', error);
      return NextResponse.json({ error: 'Failed to fetch rooms.' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);

    if (!body || !body.id) {
      return NextResponse.json({ error: 'Room ID is required.' }, { status: 400 });
    }

    // Validate numeric fields if provided
    if (body.price_per_night !== undefined && !isValidPositiveNumber(body.price_per_night)) {
      return NextResponse.json({ error: `Price must be a positive number up to ₹${VALIDATION_LIMITS.MAX_PRICE.toLocaleString()}.` }, { status: 400 });
    }
    if (body.total_units !== undefined && !isValidNonNegativeInt(body.total_units)) {
      return NextResponse.json({ error: 'Total units must be a non-negative integer.' }, { status: 400 });
    }
    if (body.available_units !== undefined && !isValidNonNegativeInt(body.available_units)) {
      return NextResponse.json({ error: 'Available units must be a non-negative integer.' }, { status: 400 });
    }

    const updates: Record<string, string | number> = {};
    if (body.price_per_night !== undefined) updates.price_per_night = Number(body.price_per_night);
    if (body.total_units !== undefined) updates.total_units = Number(body.total_units);
    if (body.available_units !== undefined) updates.available_units = Number(body.available_units);

    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update room:', error);
      return NextResponse.json({ error: 'Failed to update room settings.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to patch room:', error);
    return NextResponse.json({ error: 'Failed to update room.' }, { status: 500 });
  }
}

/**
 * POST: Creates a brand-new room category and seeds its initial room units.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const {
      name,
      description,
      price_per_night,
      occupancy_info,
      thumbnail_image_url,
      image_url,
      initial_units_count = 5,
    } = body;

    if (!isValidString(name, 2, 100)) {
      return NextResponse.json({ error: 'Category name is required (2-100 characters).' }, { status: 400 });
    }

    if (!isValidPositiveNumber(price_per_night)) {
      return NextResponse.json({ error: 'A valid positive price per night is required.' }, { status: 400 });
    }

    const unitsCount = Math.max(1, Math.min(Number(initial_units_count) || 5, VALIDATION_LIMITS.MAX_INITIAL_UNITS));

    // 1. Insert new room category
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        name: name.trim(),
        description: description || null,
        price_per_night: Number(price_per_night),
        available_units: unitsCount,
        total_units: unitsCount,
        occupancy_info: occupancy_info || '2 Adults, 1 Child',
        thumbnail_image_url: thumbnail_image_url || '/images/hero-interior.png',
        image_url: image_url || '/images/hero-interior.png',
      })
      .select()
      .single();

    if (roomError || !room) {
      console.error('Failed to create room category:', roomError);
      return NextResponse.json({ error: 'Failed to create room category.' }, { status: 500 });
    }

    // 2. Seed initial room units
    const unitRows = Array.from({ length: unitsCount }, (_, i) => ({
      room_type_id: room.id,
      room_number: `${name.trim()} - Room ${101 + i}`,
      status: 'active',
    }));

    const { error: unitsError } = await supabase.from('room_units').insert(unitRows);
    if (unitsError) {
      console.warn('Failed to seed room_units for new category:', unitsError);
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Failed to create room:', error);
    return NextResponse.json({ error: 'Failed to create room category.' }, { status: 500 });
  }
}
