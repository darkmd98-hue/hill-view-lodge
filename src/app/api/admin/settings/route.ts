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
      console.error('Failed to get site settings:', error);
      return NextResponse.json({ error: 'Failed to fetch site settings.' }, { status: 500 });
    }

    const setting = data && data.length > 0 ? data[0] : null;
    return NextResponse.json(setting);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json().catch(() => null);

    const gmap_link = body?.gmap_link;
    if (gmap_link && typeof gmap_link === 'string' && gmap_link.length > 2000) {
      return NextResponse.json({ error: 'Google Maps link is too long.' }, { status: 400 });
    }

    // Check if there is an existing setting row
    const { data: existing, error: getError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);

    if (getError) {
      console.error('Failed to check existing site settings:', getError);
      return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
    }

    let result;
    if (existing && existing.length > 0) {
      // Update the existing settings row
      const { data, error } = await supabase
        .from('site_settings')
        .update({ gmap_link: gmap_link || null, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update site settings:', error);
        return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
      }
      result = data;
    } else {
      // Insert a new settings row if none exists
      const { data, error } = await supabase
        .from('site_settings')
        .insert({ gmap_link: gmap_link || null })
        .select()
        .single();
        
      if (error) {
        console.error('Failed to insert site settings:', error);
        return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to post settings:', error);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
export { POST as PUT }; // support PUT mapping too
