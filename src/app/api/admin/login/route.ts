import { NextRequest, NextResponse } from 'next/server';

/**
 * Handle admin login, verifies password against ADMIN_PASSWORD env variable.
 * Sets a secure httpOnly cookie 'admin_session' on success.
 */
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password is not configured on the server.' },
        { status: 500 }
      );
    }

    if (password === adminPassword) {
      const response = NextResponse.json({ success: true });
      
      // Set the session cookie with httpOnly, secure, sameSite, and path attributes
      // This is an interim solution; if this becomes a long-term tool, 
      // it should be upgraded to real per-user authentication (e.g. Supabase Auth) later.
      response.cookies.set('admin_session', 'authenticated_hill_view_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day session duration
      });

      return response;
    }

    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
