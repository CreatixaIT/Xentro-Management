import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function proxy(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname;

  // Allow public routes
  const publicPaths = ['/', '/sign-up', '/sign-in', '/forgot-password', '/reset-password', '/verify-email', '/pending-approval', '/auth/callback'];
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // Protect dashboard, admin, and other protected routes
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Check profile status for employee routes
  if (path.startsWith('/dashboard') || path.startsWith('/inventory') || path.startsWith('/attendance') || path.startsWith('/projects') || path.startsWith('/tasks') || path.startsWith('/settings')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.status !== 'ACTIVE') {
      return NextResponse.redirect(new URL('/pending-approval', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/inventory/:path*', '/attendance/:path*', '/projects/:path*', '/tasks/:path*', '/settings/:path*', '/protected/:path*'],
};
