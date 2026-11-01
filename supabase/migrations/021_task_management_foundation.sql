-- Phase 1: Database Foundation for Daily Task Management
-- This migration extends the existing tasks system to support:
-- - Multi-employee task assignments
-- - Daily progress tracking
-- - Activity history
-- - Employee portfolios

-- Extend existing tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Add comment for new fields
COMMENT ON COLUMN public.tasks.start_date IS 'Task start date for multi-day tasks';
COMMENT ON COLUMN public.tasks.category IS 'Task category (Daily Work, Maintenance, Technical, Sales, Administration, Project Work, Other)';
COMMENT ON COLUMN public.tasks.duration_days IS 'Planned duration in days';
COMMENT ON COLUMN public.tasks.progress_percentage IS 'Task-level summary progress (deprecated - use assignment-level progress)';
COMMENT ON COLUMN public.tasks.completion_notes IS 'Legacy completion notes (deprecated - use assignment completion_notes)';

-- Create task_assignments table for individual employee assignments
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'REVISION_REQUESTED', 'CANCELLED')),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  actual_hours DECIMAL(10,2) DEFAULT 0 CHECK (actual_hours >= 0),
  completion_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for task_assignments
CREATE INDEX idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX idx_task_assignments_employee_id ON public.task_assignments(employee_id);
CREATE INDEX idx_task_assignments_status ON public.task_assignments(status);
CREATE INDEX idx_task_assignments_due_date ON public.task_assignments(due_date);
CREATE INDEX idx_task_assignments_assigned_by ON public.task_assignments(assigned_by);

-- Unique constraint to prevent duplicate active assignments
CREATE UNIQUE INDEX idx_task_assignments_unique_active ON public.task_assignments(task_id, employee_id)
  WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- Trigger for updated_at
CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for task_assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments
-- Employees can view their own assignments
CREATE POLICY "Employees can view own assignments"
  ON public.task_assignments
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Employees can update their own assignments (progress, daily updates)
CREATE POLICY "Employees can update own assignments"
  ON public.task_assignments
  FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Service role can manage all assignments
CREATE POLICY "Service role can manage assignments"
  ON public.task_assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to assignments"
  ON public.task_assignments
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.task_assignments TO service_role;
GRANT SELECT, UPDATE ON public.task_assignments TO authenticated;

-- Create task_daily_updates table for daily progress tracking
CREATE TABLE public.task_daily_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.task_assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_date DATE NOT NULL,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  work_description TEXT,
  hours_spent DECIMAL(10,2) CHECK (hours_spent >= 0),
  blockers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for task_daily_updates
CREATE INDEX idx_task_daily_updates_assignment_id ON public.task_daily_updates(assignment_id);
CREATE INDEX idx_task_daily_updates_employee_id ON public.task_daily_updates(employee_id);
CREATE INDEX idx_task_daily_updates_update_date ON public.task_daily_updates(update_date);

-- Trigger for updated_at
CREATE TRIGGER update_task_daily_updates_updated_at
  BEFORE UPDATE ON public.task_daily_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for task_daily_updates
ALTER TABLE public.task_daily_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_daily_updates
-- Employees can view their own daily updates
CREATE POLICY "Employees can view own daily updates"
  ON public.task_daily_updates
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Employees can insert their own daily updates
CREATE POLICY "Employees can insert own daily updates"
  ON public.task_daily_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Service role can manage all daily updates
CREATE POLICY "Service role can manage daily updates"
  ON public.task_daily_updates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to daily updates"
  ON public.task_daily_updates
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.task_daily_updates TO service_role;
GRANT SELECT, INSERT ON public.task_daily_updates TO authenticated;

-- Create task_activity_log table for audit history
CREATE TABLE public.task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.task_assignments(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for task_activity_log
CREATE INDEX idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX idx_task_activity_log_assignment_id ON public.task_activity_log(assignment_id);
CREATE INDEX idx_task_activity_log_created_at ON public.task_activity_log(created_at);
CREATE INDEX idx_task_activity_log_event_type ON public.task_activity_log(event_type);

-- Enable RLS for task_activity_log
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_activity_log
-- Append-only for regular users (no update/delete)
CREATE POLICY "Employees can view activity log for their assignments"
  ON public.task_activity_log
  FOR SELECT
  TO authenticated
  USING (
    assignment_id IN (
      SELECT id FROM public.task_assignments WHERE employee_id = auth.uid()
    )
  );

-- Service role can manage all activity logs
CREATE POLICY "Service role can manage activity logs"
  ON public.task_activity_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to activity logs"
  ON public.task_activity_log
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.task_activity_log TO service_role;
GRANT SELECT ON public.task_activity_log TO authenticated;

-- Add indexes for tasks table (new fields)
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks(start_date);

-- Backfill existing tasks into task_assignments
-- This migrates existing single-assignee tasks to the new assignment structure
INSERT INTO public.task_assignments (
  task_id,
  employee_id,
  assigned_by,
  assigned_at,
  start_date,
  due_date,
  status,
  progress_percentage,
  actual_hours,
  submitted_at,
  reviewed_at
)
SELECT 
  t.id as task_id,
  t.assigned_to as employee_id,
  t.created_by as assigned_by,
  t.created_at as assigned_at,
  COALESCE(t.start_date, t.due_date) as start_date,
  t.due_date as due_date,
  CASE 
    WHEN t.status = 'COMPLETED' THEN 'COMPLETED'
    WHEN t.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
    WHEN t.status = 'REVIEW' THEN 'REVIEW'
    WHEN t.status = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'ASSIGNED'
  END as status,
  COALESCE(t.progress_percentage, 0) as progress_percentage,
  COALESCE(t.actual_hours, 0) as actual_hours,
  t.completed_at as submitted_at,
  t.completed_at as reviewed_at
FROM public.tasks t
WHERE t.assigned_to IS NOT NULL
ON CONFLICT (task_id, employee_id) 
WHERE status NOT IN ('COMPLETED', 'CANCELLED')
DO NOTHING;

-- Log the migration activity
INSERT INTO public.task_activity_log (task_id, event_type, description, metadata)
SELECT 
  id,
  'MIGRATION',
  'Backfilled existing task into task_assignments structure',
  jsonb_build_object(
    'original_assigned_to', assigned_to,
    'original_status', status,
    'original_due_date', due_date
  )
FROM public.tasks
WHERE assigned_to IS NOT NULL;
