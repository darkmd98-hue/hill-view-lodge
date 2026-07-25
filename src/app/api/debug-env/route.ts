import { NextResponse } from 'next/server';

/**
 * A secure debug route that only checks if critical variables are defined
 * without exposing their actual secret values.
 */
export async function GET() {
  return NextResponse.json({
    RAZORPAY_KEY_ID_DEFINED: !!process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET_DEFINED: !!process.env.RAZORPAY_KEY_SECRET,
    RESEND_API_KEY_DEFINED: !!process.env.RESEND_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY_DEFINED: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL_DEFINED: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_DEFINED: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
}
