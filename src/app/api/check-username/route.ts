import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { usernameSchema } from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'check-username', 30, 60); // 30 requests per minute

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { available: false, message: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { available: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // Normalize username
    const normalized = username.trim().toLowerCase();

    // Validate format
    const validationResult = usernameSchema.safeParse(normalized);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          available: false,
          message: validationResult.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    // Check availability in database
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('username_normalized')
      .eq('username_normalized', normalized)
      .maybeSingle();

    if (error) {
      console.error('Username check error:', error);
      return NextResponse.json(
        { available: false, message: 'Error checking username availability' },
        { status: 500 }
      );
    }

    if (data) {
      return NextResponse.json(
        { available: false, message: 'Username already exists. Try another username.' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { available: true },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt || '',
        },
      }
    );
  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { available: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
