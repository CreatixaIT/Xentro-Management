import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/task-assignments/[id]/review - Review completion
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

  if (!profile || profile.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { action, review_notes } = body;

  if (!action || !['APPROVE', 'REQUEST_REVISION'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Get assignment
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('employee_id, task_id, status, completion_notes')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (assignment.status !== 'REVIEW') {
    return NextResponse.json({ error: 'Assignment is not in review status' }, { status: 400 });
  }

  // Prevent self-approval
  if (assignment.employee_id === user.id) {
    return NextResponse.json({ error: 'Cannot approve your own assignment' }, { status: 403 });
  }

  if (action === 'APPROVE') {
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: 'COMPLETED',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('task_activity_log').insert({
      task_id: assignment.task_id,
      assignment_id: id,
      actor_id: user.id,
      event_type: 'COMPLETION_APPROVED',
      description: 'Assignment completion approved',
      metadata: { review_notes },
    });
  } else if (action === 'REQUEST_REVISION') {
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: 'REVISION_REQUESTED',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from('task_activity_log').insert({
      task_id: assignment.task_id,
      assignment_id: id,
      actor_id: user.id,
      event_type: 'REVISION_REQUESTED',
      description: 'Revision requested',
      metadata: { review_notes },
    });
  }

  return NextResponse.json({ success: true });
}
