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
      .from('attendance_sessions')
      .select('*')
      .eq('profile_id', user.id)
      .order('sign_in_time', { ascending: false });

    if (startDate) {
      query = query.gte('business_date', startDate);
    }

    if (endDate) {
      query = query.lte('business_date', endDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Fetch sessions error:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Get current open session
    const { data: openSession } = await supabase
      .rpc('get_current_open_session', { p_profile_id: user.id });

    return NextResponse.json({
      sessions: sessions || [],
      currentSession: openSession && openSession.length > 0 ? openSession[0] : null,
    });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
