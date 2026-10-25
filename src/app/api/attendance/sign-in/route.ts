import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Create new attendance record for today (database will set time_in via default)
    // We need to specify business_date for the unique constraint to work
    const todayDhaka = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    const businessDate = todayDhaka.toISOString().split('T')[0];

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
      if (error.message && error.message.includes('past attendance')) {
        return NextResponse.json(
          { error: 'Cannot create attendance for past dates.' },
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
