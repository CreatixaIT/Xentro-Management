import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { usernameSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'sign-in', 10, 60); // 10 requests per minute

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many sign-in attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    // Validate username format
    const normalizedUsername = username.trim().toLowerCase();
    try {
      usernameSchema.parse(normalizedUsername);
    } catch (error) {
      return NextResponse.json(
        { message: 'Username or password/passcode is incorrect' },
        { status: 400 }
      );
    }

    // Look up email from username using service role
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceRoleClient
      .from('profiles')
      .select('email, status, role')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle();

    if (profileError || !profile) {
      // Generic error - don't reveal whether username exists
      return NextResponse.json(
        { message: 'Username or password/passcode is incorrect' },
        { status: 401 }
      );
    }

    // Authenticate with Supabase using email
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { message: 'Username or password/passcode is incorrect' },
        { status: 401 }
      );
    }

    // Email verification is temporarily disabled
    // Check account status
    if (profile.status === 'PENDING') {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: true,
          message: 'Your account is pending administrator approval',
          redirectUrl: '/pending-approval',
        },
        { status: 200 }
      );
    }

    if (profile.status === 'SUSPENDED') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: 'Your account has been suspended' },
        { status: 403 }
      );
    }

    // Account is ACTIVE - redirect to appropriate dashboard
    const redirectUrl = profile.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';
    return NextResponse.json(
      {
        success: true,
        message: 'Sign in successful',
        redirectUrl,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt || '',
        },
      }
    );
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
