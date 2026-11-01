import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/tasks/[id] - Get single task with assignments
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Get task with assignments
  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignments (
        id,
        employee_id,
        assigned_by,
        assigned_at,
        start_date,
        due_date,
        status,
        progress_percentage,
        actual_hours,
        completion_notes,
        submitted_at,
        reviewed_by,
        reviewed_at,
        review_notes,
        profiles (
          id,
          full_name,
          username
        )
      ),
      projects (
        id,
        name
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Filter assignments based on role
  let filteredAssignments = task.task_assignments;
  if (profile.role !== 'SUPER_ADMIN') {
    filteredAssignments = task.task_assignments?.filter(
      (a: any) => a.employee_id === user.id
    );
  }

  return NextResponse.json({
    ...task,
    task_assignments: filteredAssignments,
  });
}

// PATCH /api/tasks/[id] - Update task (basic fields only)
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
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Only SUPER_ADMIN can update tasks
  if (profile.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const { title, description, category, priority, due_date } = body;

  const updateData: any = {};
  if (title) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (category !== undefined) updateData.category = category;
  if (priority) updateData.priority = priority;
  if (due_date) updateData.due_date = due_date;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  await supabase.from('task_activity_log').insert({
    task_id: id,
    actor_id: user.id,
    event_type: 'TASK_UPDATED',
    description: 'Task updated',
    metadata: updateData,
  });

  return NextResponse.json({ task });
}
