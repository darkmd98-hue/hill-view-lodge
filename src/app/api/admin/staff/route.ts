import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidString, isValidPhone, isValidEmail } from '@/lib/validation';

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
      console.error('Failed to fetch staff:', error);
      return NextResponse.json({ error: 'Failed to fetch staff records.' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get staff:', error);
    return NextResponse.json({ error: 'Failed to fetch staff records.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!isValidString(body.name, 2, 100)) {
      return NextResponse.json({ error: 'Staff name is required (2-100 characters).' }, { status: 400 });
    }

    if (body.phone && !isValidPhone(body.phone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    if (body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff')
      .insert({
        name: body.name.trim(),
        role: body.role || null,
        phone: body.phone || null,
        email: body.email || null,
        joined_date: body.joined_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create staff:', error);
      return NextResponse.json({ error: 'Failed to add staff member.' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create staff:', error);
    return NextResponse.json({ error: 'Failed to add staff member.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);

    if (!body || !body.id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    if (body.name !== undefined && !isValidString(body.name, 2, 100)) {
      return NextResponse.json({ error: 'Staff name must be 2-100 characters.' }, { status: 400 });
    }

    if (body.phone && !isValidPhone(body.phone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    if (body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
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
      console.error('Failed to update staff:', error);
      return NextResponse.json({ error: 'Failed to update staff member.' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update staff:', error);
    return NextResponse.json({ error: 'Failed to update staff member.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete staff:', error);
      return NextResponse.json({ error: 'Failed to delete staff member.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete staff:', error);
    return NextResponse.json({ error: 'Failed to delete staff member.' }, { status: 500 });
  }
}
