import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

/**
 * Handle admin login, verifies password against ADMIN_PASSWORD env variable.
 * Sets a secure httpOnly cookie 'admin_session' on success.
 * Rate-limited: 5 attempts per 15 minutes per IP.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit check (strict — brute-force protection)
    const ip = getClientIP(request);
    const rl = checkRateLimit('admin-login', ip, RATE_LIMITS.AUTH_MAX_REQUESTS, RATE_LIMITS.AUTH_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.password !== 'string' || !body.password.trim()) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not configured.');
      return NextResponse.json(
        { error: 'Login is temporarily unavailable.' },
        { status: 503 }
      );
    }

    if (body.password === adminPassword) {
      const response = NextResponse.json({ success: true });
      
      // Set the session cookie with httpOnly, secure, sameSite, and path attributes
      response.cookies.set('admin_session', 'authenticated_hill_view_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day session duration
      });

      return response;
    }

    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
