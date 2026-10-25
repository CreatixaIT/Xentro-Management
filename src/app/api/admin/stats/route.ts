import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SUPER_ADMIN
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile } = await serviceRoleClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get statistics
    const [
      { count: totalEmployees },
      { count: activeEmployees },
      { count: pendingEmployees },
      { count: suspendedEmployees },
      { count: pendingResetRequests },
    ] = await Promise.all([
      serviceRoleClient.from('profiles').select('*', { count: 'exact', head: true }),
      serviceRoleClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      serviceRoleClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      serviceRoleClient.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'SUSPENDED'),
      serviceRoleClient.from('password_reset_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    ]);

    // Get pending leave requests count (handle case where table doesn't exist yet)
    let pendingLeaveRequests = 0;
    try {
      const { count } = await serviceRoleClient
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      pendingLeaveRequests = count || 0;
    } catch (error) {
      // Table doesn't exist yet (migration 017 not applied), count as 0
      pendingLeaveRequests = 0;
    }

    // Get registrations over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: registrations } = await serviceRoleClient
      .from('profiles')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const registrationsByDate: Record<string, number> = {};
    registrations?.forEach((r) => {
      const date = r.created_at.split('T')[0];
      registrationsByDate[date] = (registrationsByDate[date] || 0) + 1;
    });

    return NextResponse.json({
      totalEmployees: totalEmployees || 0,
      activeEmployees: activeEmployees || 0,
      pendingEmployees: pendingEmployees || 0,
      suspendedEmployees: suspendedEmployees || 0,
      pendingResetRequests: pendingResetRequests || 0,
      pendingLeaveRequests: pendingLeaveRequests || 0,
      registrationsByDate,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
