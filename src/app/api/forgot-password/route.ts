import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'forgot-password', 3, 300); // 3 requests per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many password recovery requests. Please try again later.' },
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
    const { email } = body;

    // Validate email format
    const normalizedEmail = email.trim().toLowerCase();
    try {
      emailSchema.parse(normalizedEmail);
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Send password recovery email
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${appUrl}/reset-password`,
    });

    if (error) {
      console.error('Password recovery error:', error);
      // Still return generic message for security
    }

    // Always return generic message for security
    return NextResponse.json(
      {
        message: 'If an account matches that email, a recovery link will be sent.',
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
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
