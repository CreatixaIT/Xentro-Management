import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to log activity
async function logActivity(supabase: any, data: {
  task_id: string;
  assignment_id?: string;
  actor_id: string;
  event_type: string;
  description: string;
  metadata?: any;
}) {
  await supabase.from('task_activity_log').insert(data);
}

// GET /api/tasks - List tasks with filtering
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const employee = searchParams.get('employee');
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const priority = searchParams.get('priority');

  let query = supabase
    .from('tasks')
    .select(`
      *,
      task_assignments (
        id,
        employee_id,
        status as assignment_status,
        progress_percentage as assignment_progress
      ),
      projects (
        id,
        name
      )
    `);

  // Filter by employee (for employee view)
  if (profile.role !== 'SUPER_ADMIN' && employee) {
    query = query.eq('assigned_to', employee);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (priority) {
    query = query.eq('priority', priority);
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

// POST /api/tasks - Create a new task
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Only SUPER_ADMIN can create tasks (for now - can be extended later)
  if (profile.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    title,
    description,
    category,
    priority,
    project_id,
    start_date,
    due_date,
    assigned_employees,
  } = body;

  // Validation
  if (!title || title.trim() === '') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (!due_date) {
    return NextResponse.json({ error: 'Due date is required' }, { status: 400 });
  }

  if (start_date && new Date(start_date) > new Date(due_date)) {
    return NextResponse.json({ error: 'Start date cannot be after due date' }, { status: 400 });
  }

  // Calculate duration
  const duration_days = start_date && due_date
    ? Math.ceil((new Date(due_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Create task using service role
  const { data: serviceUser } = await supabase.auth.getUser();
  if (!serviceUser) {
    return NextResponse.json({ error: 'Service authentication failed' }, { status: 500 });
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title: title.trim(),
      description,
      category,
      priority: priority || 'MEDIUM',
      project_id: project_id || null,
      start_date,
      due_date,
      duration_days,
      created_by: user.id,
      status: 'TODO',
    })
    .select()
    .single();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }

  // Log task creation
  await logActivity(supabase, {
    task_id: task.id,
    actor_id: user.id,
    event_type: 'TASK_CREATED',
    description: `Task "${title}" created`,
    metadata: { title, category, priority },
  });

  // Create assignments for each employee
  if (assigned_employees && assigned_employees.length > 0) {
    for (const employeeId of assigned_employees) {
      const assignmentStartDate = start_date || due_date;
      
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .insert({
          task_id: task.id,
          employee_id: employeeId,
          assigned_by: user.id,
          start_date: assignmentStartDate,
          due_date,
          status: 'ASSIGNED',
        });

      if (!assignmentError) {
        await logActivity(supabase, {
          task_id: task.id,
          actor_id: user.id,
          event_type: 'EMPLOYEE_ASSIGNED',
          description: `Task assigned to employee ${employeeId}`,
          metadata: { employee_id: employeeId },
        });
      }
    }
  }

  return NextResponse.json({ task });
}
