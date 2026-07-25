import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * CRUD API for staff members:
 * GET: Lists all staff.
 * POST: Creates new staff member.
 * PUT: Updates staff member.
 * DELETE: Removes staff member.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    const { data, error } = await supabase
      .from('staff')
      .insert({
        name: body.name,
        role: body.role,
        phone: body.phone,
        email: body.email || null,
        joined_date: body.joined_date || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create staff:', error);
    return NextResponse.json({ error: 'Failed to add staff' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff')
      .update({
        name: body.name,
        role: body.role,
        phone: body.phone,
        email: body.email || null,
        joined_date: body.joined_date || null,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update staff:', error);
    return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete staff:', error);
    return NextResponse.json({ error: 'Failed to delete staff' }, { status: 500 });
  }
}
