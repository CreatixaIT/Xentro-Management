import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { usernameSchema, emailSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'password-reset-request', 3, 300); // 3 requests per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many password reset requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    }

    const body = await request.json();
    const { username, email } = body;

    // Validate inputs
    const errors: Record<string, string> = {};

    try {
      usernameSchema.parse(username);
    } catch (e) {
      errors.username = 'Invalid username format';
    }

    try {
      emailSchema.parse(email);
    } catch (e) {
      errors.email = 'Invalid email address';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Look up profile using service role
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceRoleClient
      .from('profiles')
      .select('id, email, status')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle();

    // Generic error - don't reveal whether username/email exists
    if (profileError || !profile) {
      console.log(`[PasswordResetRequest][${correlationId}] Profile not found for username: ${normalizedUsername}`);
      return NextResponse.json(
        {
          message: 'If an account matches these details, a password reset request will be reviewed by an administrator.',
        },
        { status: 200 }
      );
    }

    // Verify email matches (don't reveal if it doesn't)
    if (profile.email !== normalizedEmail) {
      console.log(`[PasswordResetRequest][${correlationId}] Email mismatch for username: ${normalizedUsername}`);
      return NextResponse.json(
        {
          message: 'If an account matches these details, a password reset request will be reviewed by an administrator.',
        },
        { status: 200 }
      );
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await serviceRoleClient
      .from('password_reset_requests')
      .select('id, status')
      .eq('profile_id', profile.id)
      .eq('status', 'PENDING')
      .maybeSingle();

    if (existingRequest) {
      console.log(`[PasswordResetRequest][${correlationId}] Pending request already exists for profile: ${profile.id}`);
      return NextResponse.json(
        {
          message: 'If an account matches these details, a password reset request will be reviewed by an administrator.',
        },
        { status: 200 }
      );
    }

    // Create password reset request
    const { error: insertError } = await serviceRoleClient
      .from('password_reset_requests')
      .insert({
        profile_id: profile.id,
        status: 'PENDING',
      });

    if (insertError) {
      console.error(`[PasswordResetRequest][${correlationId}] Failed to create request:`, insertError);
      return NextResponse.json(
        { message: 'Failed to submit request. Please try again.' },
        { status: 500 }
      );
    }

    console.log(`[PasswordResetRequest][${correlationId}] Request created for profile: ${profile.id}`);

    return NextResponse.json(
      {
        message: 'If an account matches these details, a password reset request will be reviewed by an administrator.',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '3',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt || '',
        },
      }
    );
  } catch (error) {
    console.error(`[PasswordResetRequest][${correlationId}] Unexpected error:`, error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
