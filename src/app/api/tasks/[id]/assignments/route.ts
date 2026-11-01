import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/tasks/[id]/assignments - Create assignment
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { employee_id, start_date, due_date } = body;

  if (!employee_id) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  // Verify employee exists and is active
  const { data: employee } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', employee_id)
    .single();

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  if (employee.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Employee is not active' }, { status: 400 });
  }

  // Get task to get start_date if not provided
  const { data: task } = await supabase
    .from('tasks')
    .select('start_date, due_date')
    .eq('id', id)
    .single();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const assignmentStartDate = start_date || task.start_date || task.due_date;
  const assignmentDueDate = due_date || task.due_date;

  if (new Date(assignmentStartDate) > new Date(assignmentDueDate)) {
    return NextResponse.json({ error: 'Start date cannot be after due date' }, { status: 400 });
  }

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('task_assignments')
    .insert({
      task_id: id,
      employee_id,
      assigned_by: user.id,
      start_date: assignmentStartDate,
      due_date: assignmentDueDate,
      status: 'ASSIGNED',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('task_activity_log').insert({
    task_id: id,
    assignment_id: assignment.id,
    actor_id: user.id,
    event_type: 'EMPLOYEE_ASSIGNED',
    description: `Task assigned to employee ${employee_id}`,
    metadata: { employee_id },
  });

  return NextResponse.json({ assignment });
}

// GET /api/tasks/[id]/assignments - Get task assignments
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;
  let query = supabase
    .from('task_assignments')
    .select(`
      *,
      profiles (
        id,
        full_name,
        username
      )
    `)
    .eq('task_id', id);

  // Employees can only see their own assignments
  if (profile.role !== 'SUPER_ADMIN') {
    query = query.eq('employee_id', user.id);
  }

  const { data: assignments, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments });
}
