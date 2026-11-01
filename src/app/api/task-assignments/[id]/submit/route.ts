import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/task-assignments/[id]/submit - Submit completion
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
  const { completion_notes } = body;

  // Verify ownership
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('employee_id, task_id, status, progress_percentage')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Only assigned employee can submit
  if (assignment.employee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (assignment.status === 'COMPLETED' || assignment.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Assignment already completed or cancelled' }, { status: 400 });
  }

  // Require at least some progress
  if (assignment.progress_percentage < 100) {
    return NextResponse.json({ error: 'Complete the task before submitting (progress must be 100%)' }, { status: 400 });
  }

  // Update assignment
  const { error } = await supabase
    .from('task_assignments')
    .update({
      status: 'REVIEW',
      completion_notes,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('task_activity_log').insert({
    task_id: assignment.task_id,
    assignment_id: id,
    actor_id: user.id,
    event_type: 'COMPLETION_SUBMITTED',
    description: 'Assignment submitted for review',
    metadata: { completion_notes },
  });

  return NextResponse.json({ success: true });
}
