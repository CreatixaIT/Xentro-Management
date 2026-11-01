import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// PATCH /api/task-assignments/[id] - Update assignment (progress only)
export async function PATCH(
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
  const { progress_percentage, actual_hours } = body;

  // Verify ownership
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('employee_id, task_id, status, progress_percentage, actual_hours')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Only assigned employee or SUPER_ADMIN can update
  if (profile.role !== 'SUPER_ADMIN' && assignment.employee_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updateData: any = {};
  if (progress_percentage !== undefined) {
    if (progress_percentage < 0 || progress_percentage > 100) {
      return NextResponse.json({ error: 'Progress must be between 0 and 100' }, { status: 400 });
    }
    updateData.progress_percentage = progress_percentage;
    
    // Update status based on progress
    if (progress_percentage > 0 && assignment.status === 'ASSIGNED') {
      updateData.status = 'IN_PROGRESS';
    }
  }
  
  if (actual_hours !== undefined) {
    if (actual_hours < 0) {
      return NextResponse.json({ error: 'Hours must be non-negative' }, { status: 400 });
    }
    updateData.actual_hours = actual_hours;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('task_assignments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  if (progress_percentage !== undefined) {
    await supabase.from('task_activity_log').insert({
      task_id: assignment.task_id,
      assignment_id: id,
      actor_id: user.id,
      event_type: 'PROGRESS_CHANGED',
      description: `Progress updated to ${progress_percentage}%`,
      metadata: { progress_percentage },
    });
  }

  return NextResponse.json({ assignment: updated });
}

// POST /api/task-assignments/[id]/cancel - Cancel assignment
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
  const { data: assignment } = await supabase
    .from('task_assignments')
    .select('task_id, employee_id, status')
    .eq('id', id)
    .single();

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  if (assignment.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Cannot cancel completed assignment' }, { status: 400 });
  }

  const { error } = await supabase
    .from('task_assignments')
    .update({ status: 'CANCELLED' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('task_activity_log').insert({
    task_id: assignment.task_id,
    assignment_id: id,
    actor_id: user.id,
    event_type: 'TASK_CANCELLED',
    description: 'Assignment cancelled',
  });

  return NextResponse.json({ success: true });
}
