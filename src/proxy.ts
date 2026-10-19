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

  // Protect dashboard and other protected routes
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/protected/:path*'],
};
