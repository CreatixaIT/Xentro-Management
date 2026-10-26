import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Super Admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'pending';

    let query = supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('status', 'PENDING');
    } else if (filter === 'processed') {
      query = query.in('status', ['APPROVED', 'REJECTED']);
    }

    const { data: requests, error } = await query;

    // Handle case where table doesn't exist yet
    if (error && error.code === '42P01') {
      return NextResponse.json({ error: 'Leave requests table not found. Please apply migration 017.' }, { status: 404 });
    }

    if (error) {
      console.error('Fetch leave requests error:', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    // Collect unique profile IDs
    const profileIds = [...new Set((requests || []).map((req: any) => req.profile_id))];

    // Fetch profiles for those IDs
    let profilesMap: Record<string, any> = {};
    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email, full_name')
        .in('id', profileIds);

      if (profilesError) {
        console.error('Fetch profiles error:', profilesError);
        return NextResponse.json({ error: 'Failed to fetch employee profiles' }, { status: 500 });
      }

      // Create a map for easy lookup
      profilesMap = (profiles || []).reduce((map: Record<string, any>, profile: any) => {
        map[profile.id] = profile;
        return map;
      }, {});
    }

    // Format response with employee details
    const formattedRequests = (requests || []).map((req: any) => {
      const profile = profilesMap[req.profile_id];
      const employeeName = profile?.full_name || profile?.username || req.profile_id;
      return {
        ...req,
        employee_name: employeeName,
        employee_username: profile?.username || null,
        employee_email: profile?.email || null,
        employee_profile_id: req.profile_id,
      };
    });

    return NextResponse.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
