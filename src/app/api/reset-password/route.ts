import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { passwordOrPasscodeSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'reset-password', 5, 300); // 5 requests per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many password reset attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    }

    const body = await request.json();
    const { password, confirmPassword, passwordMode } = body;

    // Validate password format
    try {
      passwordOrPasscodeSchema.parse(password);
    } catch (error) {
      return NextResponse.json(
        { errors: { password: 'Invalid password or passcode format' } },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { errors: { confirmPassword: 'Password and confirm password do not match' } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Update user password
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error('Password update error:', error);
      return NextResponse.json(
        { message: 'Failed to reset password. The link may be invalid or expired.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successfully. Please sign in with your new password.',
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt || '',
        },
      }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
