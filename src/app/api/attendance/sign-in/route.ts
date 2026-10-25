import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user has an open session
    const { data: openSession, error: rpcError } = await supabase
      .rpc('get_current_open_session', { p_profile_id: user.id });

    if (rpcError) {
      console.error('RPC error checking open session:', rpcError);
      return NextResponse.json({ error: 'Failed to check session status' }, { status: 500 });
    }

    if (openSession && openSession.length > 0) {
      return NextResponse.json(
        { error: 'You already have an open session. Please sign out first.' },
        { status: 400 }
      );
    }

    // Create new attendance session (database will set sign_in_time via default)
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert({
        profile_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Sign-in error:', error);
      if (error.code === '23505') {
        // Unique constraint violation - already has open session
        return NextResponse.json(
          { error: 'You already have an open session. Please sign out first.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        sign_in_time: session.sign_in_time,
        business_date: session.business_date,
      },
    });
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
