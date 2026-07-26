import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET: Lists all room units with category details.
 */
interface RoomUnitAPIResponse {
  id: string;
  room_number: string;
  status?: string;
  room_type_id: string;
  rooms: unknown;
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    let data: RoomUnitAPIResponse[] = [];
    let fetchError = null;

    const { data: dataWithStatus, error: errWithStatus } = await supabase
      .from('room_units')
      .select('id, room_number, status, room_type_id, rooms:room_type_id (name)')
      .order('room_number', { ascending: true });

    if (errWithStatus) {
      if (errWithStatus.message.includes('status') || errWithStatus.message.includes('column')) {
        const { data: dataWithoutStatus, error: errWithoutStatus } = await supabase
          .from('room_units')
          .select('id, room_number, room_type_id, rooms:room_type_id (name)')
          .order('room_number', { ascending: true });
        
        if (errWithoutStatus) {
          fetchError = errWithoutStatus;
        } else {
          data = (dataWithoutStatus || []).map(u => ({ ...u, status: 'active' }));
        }
      } else {
        fetchError = errWithStatus;
      }
    } else {
      data = dataWithStatus || [];
    }

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get room units:', error);
    return NextResponse.json({ error: 'Failed to fetch room units' }, { status: 500 });
  }
}

/**
 * POST: Inserts a new room unit for a category.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { roomTypeId, roomNumber } = await request.json();

    if (!roomTypeId || !roomNumber) {
      return NextResponse.json({ error: 'Room category and room number are required' }, { status: 400 });
    }

    let data: Record<string, string | number | null> | null = null;
    let error = null;

    const { data: insertWithStatus, error: errWithStatus } = await supabase
      .from('room_units')
      .insert({
        room_type_id: roomTypeId,
        room_number: roomNumber,
        status: 'active'
      })
      .select()
      .single();

    if (errWithStatus) {
      if (errWithStatus.message.includes('status') || errWithStatus.message.includes('column')) {
        const { data: insertWithoutStatus, error: errWithoutStatus } = await supabase
          .from('room_units')
          .insert({
            room_type_id: roomTypeId,
            room_number: roomNumber
          })
          .select()
          .single();
        
        data = insertWithoutStatus;
        error = errWithoutStatus;
      } else {
        error = errWithStatus;
      }
    } else {
      data = insertWithStatus;
    }

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to insert room unit:', error);
    return NextResponse.json({ error: 'Failed to create room unit' }, { status: 500 });
  }
}

/**
 * PATCH: Updates a room unit's number or service status.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { id, roomNumber, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Room unit ID is required' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (roomNumber !== undefined) updates.room_number = roomNumber;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('room_units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message.includes('status') || error.message.includes('column')) {
        return NextResponse.json({
          error: "Service status management requires the Supabase database migration v4 status column. Please run the supabase-migration-v4.sql script in your Supabase dashboard SQL Editor first."
        }, { status: 400 });
      }
      console.error('Database update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to update room unit:', error);
    return NextResponse.json({ error: 'Failed to update room unit' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a specific room unit.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Room unit ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('room_units')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete room unit:', error);
    return NextResponse.json({ error: 'Failed to delete room unit' }, { status: 500 });
  }
}
