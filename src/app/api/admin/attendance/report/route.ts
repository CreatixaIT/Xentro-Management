import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Super Admin role
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile } = await serviceRoleClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period') || 'month';
    const date = searchParams.get('date');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Calculate date range based on period
    const { startDate, endDate } = getDateRange(period, date);

    // Fetch attendance records
    const { data: attendance, error: attendanceError } = await serviceRoleClient
      .from('attendance')
      .select('*')
      .eq('profile_id', employeeId)
      .gte('business_date', startDate)
      .lte('business_date', endDate)
      .order('business_date', { ascending: true });

    if (attendanceError) {
      console.error('Fetch attendance error:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    // Fetch leave requests
    const { data: leaveRequests, error: leaveError } = await serviceRoleClient
      .from('leave_requests')
      .select('*')
      .eq('profile_id', employeeId)
      .in('status', ['APPROVED', 'PENDING'])
      .order('start_date', { ascending: true });

    if (leaveError) {
      console.error('Fetch leave requests error:', leaveError);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    // Calculate summary metrics
    const summary = calculateSummary(attendance || [], leaveRequests || [], startDate, endDate);

    return NextResponse.json({
      attendance: attendance || [],
      leaveRequests: leaveRequests || [],
      summary,
      period,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Fetch attendance report error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

function getDateRange(period: string, dateParam: string | null): { startDate: string; endDate: string } {
  const now = dateParam ? new Date(dateParam) : new Date();
  const timeZone = 'Asia/Dhaka';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-CA', { timeZone }); // en-CA gives YYYY-MM-DD
  };

  switch (period) {
    case 'day': {
      const startDate = formatDate(now);
      return { startDate, endDate: startDate };
    }
    case 'week': {
      // Get Monday of the week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
        startDate: formatDate(monday),
        endDate: formatDate(sunday),
      };
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
      };
    }
    case 'year': {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);

      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
      };
    }
    default:
      // Default to month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        startDate: formatDate(firstDay),
        endDate: formatDate(lastDay),
      };
  }
}

function calculateSummary(
  attendance: any[],
  leaveRequests: any[],
  startDate: string,
  endDate: string
) {
  let presentDays = 0;
  let approvedLeaveDays = 0;
  let pendingLeaveDays = 0;
  let absentDays = 0;
  let totalMinutes = 0;

  // Build a set of dates with approved leave
  const approvedLeaveDates = new Set<string>();
  const pendingLeaveDates = new Set<string>();

  for (const leave of leaveRequests) {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      if (leave.status === 'APPROVED') {
        approvedLeaveDates.add(dateStr);
      } else if (leave.status === 'PENDING') {
        pendingLeaveDates.add(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
  }

  // Count attendance
  for (const record of attendance) {
    if (record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'HALF_DAY') {
      presentDays++;
      if (record.work_duration_minutes) {
        totalMinutes += record.work_duration_minutes;
      }
    }
  }

  // Count leave days
  approvedLeaveDays = approvedLeaveDates.size;
  pendingLeaveDays = pendingLeaveDates.size;

  // Calculate total business days in range (excluding weekends)
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalBusinessDays = 0;

  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    // In Bangladesh, Friday (5) and Saturday (6) are weekends
    // Business days: Sunday (0), Monday (1), Tuesday (2), Wednesday (3), Thursday (4)
    if (day !== 5 && day !== 6) {
      totalBusinessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Absent = business days - present - approved leave - pending leave
  absentDays = Math.max(0, totalBusinessDays - presentDays - approvedLeaveDays - pendingLeaveDays);

  const totalHours = totalMinutes / 60;
  const avgHoursPerPresentDay = presentDays > 0 ? totalHours / presentDays : 0;

  return {
    presentDays,
    approvedLeaveDays,
    pendingLeaveDays,
    absentDays,
    totalHours: Math.round(totalHours * 100) / 100,
    avgHoursPerPresentDay: Math.round(avgHoursPerPresentDay * 100) / 100,
    totalBusinessDays,
  };
}
