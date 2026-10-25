import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current open session
    const { data: openSession } = await supabase
      .rpc('get_current_open_session', { p_profile_id: user.id });

    if (!openSession || openSession.length === 0) {
      return NextResponse.json(
        { error: 'No open session found. Please sign in first.' },
        { status: 400 }
      );
    }

    // Close the session
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .update({
        sign_out_time: new Date().toISOString(),
      })
      .eq('id', openSession[0].id)
      .select()
      .single();

    if (error) {
      console.error('Sign-out error:', error);
      return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sign_in_time: session.sign_in_time,
        sign_out_time: session.sign_out_time,
        business_date: session.business_date,
        duration_minutes: session.duration_minutes,
      },
    });
  } catch (error) {
    console.error('Sign-out error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
