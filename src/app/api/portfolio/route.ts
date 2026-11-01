import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/portfolio - Get completed work portfolio
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const employee = searchParams.get('employee');

  let query = supabase
    .from('task_assignments')
    .select(`
      *,
      tasks (
        id,
        title,
        description,
        category,
        priority,
        projects (
          id,
          name
        )
      ),
      profiles (
        id,
        full_name,
        username
      )
    `)
    .eq('status', 'COMPLETED');

  // Filter by employee (for employee view or Super Admin filtering)
  if (profile.role !== 'SUPER_ADMIN' || employee) {
    const targetEmployeeId = employee || user.id;
    query = query.eq('employee_id', targetEmployeeId);
  }

  const { data: assignments, error } = await query
    .order('reviewed_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments });
}
