import { NextResponse } from 'next/server';

/**
 * Handle admin logout by clearing the session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // Clears the cookie immediately
  });

  return response;
}
