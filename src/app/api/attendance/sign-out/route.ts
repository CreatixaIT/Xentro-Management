import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use database function to sign out (generates timestamp server-side)
    const { data: attendance, error: rpcError } = await supabase
      .rpc('sign_out_attendance', { p_profile_id: user.id });

    if (rpcError) {
      console.error('Sign-out RPC error:', rpcError);
      // Check if function doesn't exist (migration 016 not applied)
      if (rpcError.code === '42883' || rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Attendance enhancements not yet applied. Please contact administrator.' },
          { status: 503 }
        );
      }
      if (rpcError.message && rpcError.message.includes('No open attendance record')) {
        return NextResponse.json(
          { error: 'No attendance record found for today. Please sign in first.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: `Failed to sign out: ${rpcError.message}` }, { status: 500 });
    }

    if (!attendance || attendance.length === 0) {
      return NextResponse.json(
        { error: 'No attendance record found for today. Please sign in first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance[0].attendance_id,
        time_in: attendance[0].attendance_time_in,
        time_out: attendance[0].attendance_time_out,
        business_date: attendance[0].attendance_business_date, // Use database business_date
        work_duration_minutes: attendance[0].attendance_duration_minutes,
        status: attendance[0].attendance_status,
      },
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
