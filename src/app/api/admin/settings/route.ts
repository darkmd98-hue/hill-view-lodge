import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET: Fetches the site settings (e.g. Google Maps link).
 * POST: Inserts or updates the site settings.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const setting = data && data.length > 0 ? data[0] : null;
    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { gmap_link } = await request.json();

    // Check if there is an existing setting row
    const { data: existing, error: getError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);

    if (getError) {
      return NextResponse.json({ error: getError.message }, { status: 500 });
    }

    let result;
    if (existing && existing.length > 0) {
      // Update the existing settings row
      const { data, error } = await supabase
        .from('site_settings')
        .update({ gmap_link, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    } else {
      // Insert a new settings row if none exists
      const { data, error } = await supabase
        .from('site_settings')
        .insert({ gmap_link })
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to post settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
export { POST as PUT }; // support PUT mapping too
