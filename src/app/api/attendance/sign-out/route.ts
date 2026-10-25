import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get today's business date in Asia/Dhaka
    const todayDhaka = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const businessDate = todayDhaka.toISOString().split('T')[0];

    // Get today's attendance record
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .eq('business_date', businessDate)
      .single();

    if (fetchError) {
      console.error('Error fetching attendance:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No attendance record found for today. Please sign in first.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    if (!attendance) {
      return NextResponse.json(
        { error: 'No attendance record found for today. Please sign in first.' },
        { status: 400 }
      );
    }

    if (!attendance.time_in) {
      return NextResponse.json(
        { error: 'No sign-in time found. Please sign in first.' },
        { status: 400 }
      );
    }

    if (attendance.time_out) {
      return NextResponse.json(
        { error: 'You have already signed out today.' },
        { status: 400 }
      );
    }

    // Sign out - set time_out (database will set it via default, trigger will calculate duration)
    const { data: updatedAttendance, error: updateError } = await supabase
      .from('attendance')
      .update({
        time_out: new Date().toISOString(),
      })
      .eq('id', attendance.id)
      .eq('profile_id', user.id) // Ensure user can only update their own record
      .select()
      .single();

    if (updateError) {
      console.error('Sign-out error:', updateError);
      return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attendance: {
        id: updatedAttendance.id,
        time_in: updatedAttendance.time_in,
        time_out: updatedAttendance.time_out,
        business_date: updatedAttendance.business_date,
        work_duration_minutes: updatedAttendance.work_duration_minutes,
        status: updatedAttendance.status,
      },
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
