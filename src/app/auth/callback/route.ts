import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Allowlist of safe redirect paths
const ALLOWED_REDIRECTS = ['/sign-in', '/'];

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  // Validate next parameter against allowlist
  const safeNext = next && ALLOWED_REDIRECTS.includes(next) ? next : '/sign-in';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successfully verified email - redirect to sign in with success message
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
      return NextResponse.redirect(`${appUrl}/sign-in?verified=1`);
    }
  }

  // Error or no code - redirect to sign in with error
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  return NextResponse.redirect(`${appUrl}/sign-in?error=verification_failed`);
}
