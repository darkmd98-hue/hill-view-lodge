import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import { isValidEmail, isValidPhone, isValidString, VALIDATION_LIMITS } from '@/lib/validation';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

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
    // Rate limit check (strict — spam account prevention)
    const ip = getClientIP(request);
    const rl = checkRateLimit('signup', ip, RATE_LIMITS.AUTH_MAX_REQUESTS, RATE_LIMITS.AUTH_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many signup attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password, fullName, phone, dob } = body;

    // 1. Validate all fields — strict server-side checks
    if (!email || !password || !fullName || !phone || !dob) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!isValidString(fullName, VALIDATION_LIMITS.NAME_MIN_LENGTH, VALIDATION_LIMITS.NAME_MAX_LENGTH)) {
      return NextResponse.json({ error: `Name must be between ${VALIDATION_LIMITS.NAME_MIN_LENGTH} and ${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters.` }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < VALIDATION_LIMITS.PASSWORD_MIN_LENGTH || password.length > VALIDATION_LIMITS.PASSWORD_MAX_LENGTH) {
      return NextResponse.json({ error: `Password must be between ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} and ${VALIDATION_LIMITS.PASSWORD_MAX_LENGTH} characters.` }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian phone number.' }, { status: 400 });
    }

    const { valid: ageValid, age } = isValidDOB(dob);
    if (!ageValid) {
      return NextResponse.json({ error: `Invalid date of birth. Minimum age requirement is 18 (calculated age: ${age}).` }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1b. Check if phone number is already associated with another account
    const cleanPhone = phone.trim();
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'This phone number is already registered with a different account.' },
        { status: 400 }
      );
    }

    // 2. Create the Auth User in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (authError) {
      console.error('Supabase Auth signup error:', authError);
      // Generic message to prevent email enumeration
      return NextResponse.json({ error: 'Account creation failed. The email may already be in use.' }, { status: 400 });
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json({ error: 'Account creation failed. Please try again.' }, { status: 500 });
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
      console.error('Profile insertion error:', profileError);
      // Clean up the created auth user to avoid orphan accounts on error
      await supabase.auth.admin.deleteUser(user.id);
      return NextResponse.json({ error: 'Failed to initialize user profile. Please try again.' }, { status: 500 });
    }

    // 4. Send Welcome Email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const ownerEmail = process.env.OWNER_EMAIL || 'codeex97@gmail.com';
        const isSandbox = fromEmail.includes('onboarding@resend.dev');
        const recipient = isSandbox ? ownerEmail : email;
        const subjectPrefix = isSandbox ? `[Sandbox for ${email}] ` : '';

        await resend.emails.send({
          from: `Hill View <${fromEmail}>`,
          to: recipient,
          subject: `${subjectPrefix}Welcome to Hill View Lodge — Account Created`,
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
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
