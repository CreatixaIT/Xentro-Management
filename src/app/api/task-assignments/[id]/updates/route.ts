import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/task-assignments/[id]/updates - Get daily updates for an assignment
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
  // Verify ownership
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('employee_id, task_id')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Only assigned employee or SUPER_ADMIN can view
  if (profile.role !== 'SUPER_ADMIN' && assignment.employee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: updates, error } = await supabase
    .from('task_daily_updates')
    .select('*')
    .eq('assignment_id', id)
    .order('update_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates });
}

// POST /api/task-assignments/[id]/updates - Submit daily progress update
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
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { update_date, progress_percentage, work_description, hours_spent, blockers } = body;

  // Verify ownership
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('employee_id, task_id, status, progress_percentage, actual_hours')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Only assigned employee can submit updates
  if (assignment.employee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Cannot update completed or cancelled assignment' }, { status: 400 });
  }

  // Validation
  if (!update_date) {
    return NextResponse.json({ error: 'Update date is required' }, { status: 400 });
  }

  if (progress_percentage < 0 || progress_percentage > 100) {
    return NextResponse.json({ error: 'Progress must be between 0 and 100' }, { status: 400 });
  }

  if (hours_spent !== undefined && hours_spent < 0) {
    return NextResponse.json({ error: 'Hours must be non-negative' }, { status: 400 });
  }

  // Create daily update
  const { data: update, error } = await supabase
    .from('task_daily_updates')
    .insert({
      assignment_id: id,
      employee_id: user.id,
      update_date,
      progress_percentage,
      work_description,
      hours_spent,
      blockers,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update assignment progress if new progress is higher
  if (progress_percentage !== undefined && progress_percentage > assignment.progress_percentage) {
    await supabase
      .from('task_assignments')
      .update({
        progress_percentage,
        status: 'IN_PROGRESS',
      })
      .eq('id', id);
  }

  // Update actual hours
  if (hours_spent !== undefined) {
    await supabase
      .from('task_assignments')
      .update({
        actual_hours: (assignment.actual_hours || 0) + hours_spent,
      })
      .eq('id', id);
  }

  // Log activity
  await supabase.from('task_activity_log').insert({
    task_id: assignment.task_id,
    assignment_id: id,
    actor_id: user.id,
    event_type: 'DAILY_UPDATE_SUBMITTED',
    description: `Daily progress update submitted (${progress_percentage}%)`,
    metadata: { update_date, progress_percentage, hours_spent },
  });

  return NextResponse.json({ update });
}
