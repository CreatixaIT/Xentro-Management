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
      .select(`
        *,
        profiles!leave_requests_profile_id_fkey (
          username,
          email
        )
      `)
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

    // Format response
    const formattedRequests = (requests || []).map((req: any) => ({
      ...req,
      employee_name: req.profiles?.username,
      employee_email: req.profiles?.email,
    }));

    return NextResponse.json({ requests: formattedRequests });
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
