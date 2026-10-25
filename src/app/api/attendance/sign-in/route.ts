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

    // Check if employee already has attendance for today
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .eq('business_date', businessDate)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for new attendance
      console.error('Error checking existing attendance:', checkError);
      return NextResponse.json({ error: 'Failed to check attendance status' }, { status: 500 });
    }

    if (existingAttendance) {
      // Already has attendance for today
      if (existingAttendance.time_out) {
        return NextResponse.json(
          { error: 'You have already completed attendance for today.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: 'You have already signed in today.' },
          { status: 400 }
        );
      }
    }

    // Create new attendance record for today (database will set time_in via default)
    const { data: attendance, error } = await supabase
      .from('attendance')
      .insert({
        profile_id: user.id,
        business_date: businessDate,
        status: 'PRESENT',
      })
      .select()
      .single();

    if (error) {
      console.error('Sign-in error:', error);
      if (error.code === '23505') {
        // Unique constraint violation - already has attendance for today
        return NextResponse.json(
          { error: 'You have already signed in today.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attendance: {
        id: attendance.id,
        time_in: attendance.time_in,
        business_date: attendance.business_date,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
