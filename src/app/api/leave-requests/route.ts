import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by month/year if provided (filter by date range overlap)
    if (year && month) {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(monthNum).padStart(2, '0')}-31`;

      // Filter requests whose date range overlaps with the selected month
      query = query.or(`start_date.lte.${monthEnd},end_date.gte.${monthStart}`);
    }

    const { data: requests, error } = await query;

    // Handle case where table doesn't exist yet
    if (error && error.code === '42P01') {
      return NextResponse.json({ requests: [] });
    }

    if (error) {
      console.error('Fetch leave requests error:', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { startDate, endDate, reason } = body as { startDate: string; endDate: string; reason: string };

    // Validation
    if (!startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Parse YYYY-MM-DD strings directly (timezone-neutral)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const trimmedReason = reason.trim();

    if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Convert to Date objects for comparison (treated as UTC midnight to avoid timezone shifts)
    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Check if start date is in the past using Asia/Dhaka timezone
    // Get today's date in Asia/Dhaka as YYYY-MM-DD
    const now = new Date();
    const dhakaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); // en-CA gives YYYY-MM-DD
    const [todayYear, todayMonth, todayDay] = dhakaDateStr.split('-').map(Number);
    const todayDhaka = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay));

    if (start < todayDhaka) {
      return NextResponse.json(
        { error: 'Cannot request leave for past dates' },
        { status: 400 }
      );
    }

    if (!trimmedReason || trimmedReason.length === 0) {
      return NextResponse.json(
        { error: 'Reason cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedReason.length > 1000) {
      return NextResponse.json(
        { error: 'Reason must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Check for overlapping leave requests
    const { data: hasOverlap, error: overlapError } = await supabase
      .rpc('check_overlapping_leave_requests', {
        p_profile_id: user.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

    if (overlapError) {
      console.error('Overlap check error:', overlapError);
      // Check if function doesn't exist (migration 017 not applied)
      if (overlapError.code === '42883' || overlapError.message?.includes('function') && overlapError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Leave requests feature not yet enabled. Please contact administrator.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: `Failed to check for overlapping requests: ${overlapError.message}` }, { status: 500 });
    }

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'You already have a leave request for this date range' },
        { status: 400 }
      );
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .insert({
        profile_id: user.id,
        start_date: startDate,
        end_date: endDate,
        reason: trimmedReason,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      console.error('Create leave request error:', error);
      // Check if table doesn't exist (migration 017 not applied)
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Leave requests feature not yet enabled. Please contact administrator.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: `Failed to create leave request: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      request: leaveRequest,
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
