import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: requests, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

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

    const start = new Date(startDate);
    const end = new Date(endDate);
    const trimmedReason = reason.trim();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Check if start date is in the past using Asia/Dhaka timezone
    const todayDhaka = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    todayDhaka.setHours(0, 0, 0, 0);
    if (start.getTime() < todayDhaka.getTime()) {
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
      return NextResponse.json({ error: 'Failed to check for overlapping requests' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
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
