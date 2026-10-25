import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .order('business_date', { ascending: false });

    if (startDate) {
      query = query.gte('business_date', startDate);
    }

    if (endDate) {
      query = query.lte('business_date', endDate);
    }

    const { data: attendanceRecords, error } = await query;

    if (error) {
      console.error('Fetch attendance error:', error);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    // Get today's attendance using stable YYYY-MM-DD format in Asia/Dhaka
    const now = new Date();
    const businessDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }); // en-CA gives YYYY-MM-DD

    const { data: todayAttendance, error: todayError } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', user.id)
      .eq('business_date', businessDate)
      .single();

    // Map attendance records to session-like format for frontend compatibility
    const sessions = (attendanceRecords || []).map(record => ({
      id: record.id,
      profile_id: record.profile_id,
      sign_in_time: record.time_in,
      sign_out_time: record.time_out,
      business_date: record.business_date,
      duration_minutes: record.work_duration_minutes,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));

    return NextResponse.json({
      sessions,
      currentSession: todayAttendance && !todayAttendance.time_out ? {
        id: todayAttendance.id,
        sign_in_time: todayAttendance.time_in,
        business_date: todayAttendance.business_date,
      } : null,
    });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
