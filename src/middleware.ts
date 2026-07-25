import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to protect admin dashboard and api routes.
 * Checks for a secure httpOnly cookie 'admin_session'.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except the login page)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('admin_session');
    if (!session || session.value !== 'authenticated_hill_view_session') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect /api/admin routes (except the login api)
  if (pathname.startsWith('/api/admin') && pathname !== '/api/admin/login') {
    const session = request.cookies.get('admin_session');
    if (!session || session.value !== 'authenticated_hill_view_session') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
