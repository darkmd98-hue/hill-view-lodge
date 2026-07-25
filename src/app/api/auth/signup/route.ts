import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

// Helper to calculate exact age and validate DOB
function isValidDOB(dob: string): { valid: boolean; age: number } {
  const date = new Date(dob);
  if (isNaN(date.getTime())) return { valid: false, age: 0 };
  
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  
  const valid = age >= 18 && age <= 120;
  return { valid, age };
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone, dob } = await request.json();

    // 1. Validate fields
    if (!email || !password || !fullName || !phone || !dob) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const { valid: ageValid, age } = isValidDOB(dob);
    if (!ageValid) {
      return NextResponse.json({ error: `Invalid date of birth. Minimum age requirement is 18 (current age is ${age}).` }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 2. Create the Auth User in Supabase
    // Note: In local/dev environments, email verification is enabled by default.
    // If you want auto-confirm, set email_confirm: true. We use email_confirm: true 
    // to allow instant profile creation, while Supabase handles verification links if needed.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (authError) {
      console.error('Supabase Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }

    // 3. Insert into the public profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        phone,
        date_of_birth: dob,
      });

    if (profileError) {
      console.error('Supabase profile insertion error:', profileError);
      // Clean up the created auth user to avoid orphan accounts on error
      await supabase.auth.admin.deleteUser(user.id);
      return NextResponse.json({ error: 'Failed to initialize user profile.' }, { status: 500 });
    }

    // 4. Send Welcome Email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: `Hill View <${fromEmail}>`,
          to: email,
          subject: 'Welcome to Hill View Lodge — Account Created',
          html: `
            <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
              <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View</h2>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
              <p>Dear <strong>${fullName}</strong>,</p>
              <p>Welcome to Hill View Lodge! Your account has been successfully created.</p>
              <p>You can now log in to reserve premium stays, view visual category listings, and manage your bookings.</p>
              <div style="background: #f7f4ef; padding: 16px; border-radius: 8px; border-left: 3px solid #c8781f; margin: 20px 0;">
                <strong>Contact Number:</strong> ${phone}<br />
                <strong>Registered Email:</strong> ${email}<br />
                <strong>Age Verified:</strong> ${age} years old
              </div>
              <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This is a no-reply address. For booking assistance, contact property care directly.</p>
              <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View</strong></p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr);
      }
    } else {
      console.warn('RESEND_API_KEY is not configured. Welcome email skipped.');
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err) {
    console.error('Signup handler error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
