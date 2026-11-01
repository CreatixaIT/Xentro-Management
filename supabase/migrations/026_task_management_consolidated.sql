-- Phase 2.7: Consolidated Task Management Database Foundation
-- This migration consolidates migrations 021 and 025 into a single authoritative migration
-- Migrations 021-025 are preserved in Git history for reference but are deprecated
-- This migration should be applied to both fresh and existing databases

-- ============================================================================
-- EXTEND EXISTING TASKS TABLE
-- ============================================================================

-- Add new columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Add comments for new fields
COMMENT ON COLUMN public.tasks.start_date IS 'Task start date for multi-day tasks';
COMMENT ON COLUMN public.tasks.category IS 'Task category (Daily Work, Maintenance, Technical, Sales, Administration, Project Work, Other)';
COMMENT ON COLUMN public.tasks.duration_days IS 'Planned duration in days';
COMMENT ON COLUMN public.tasks.progress_percentage IS 'Task-level summary progress (deprecated - use assignment-level progress)';
COMMENT ON COLUMN public.tasks.completion_notes IS 'Legacy completion notes (deprecated - use assignment completion_notes)';

-- Add indexes for new task fields
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON public.tasks(start_date);

-- ============================================================================
-- CREATE TASK_ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_assignments (
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
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee_id ON public.task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_due_date ON public.task_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON public.task_assignments(assigned_by);

-- Unique constraint to prevent duplicate active assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_assignments_unique_active ON public.task_assignments(task_id, employee_id)
  WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_task_assignments_updated_at ON public.task_assignments;
CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for task_assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASK_ASSIGNMENTS RLS POLICIES
-- ============================================================================

-- Drop any existing policies (from migrations 021-025 if they were applied)
DROP POLICY IF EXISTS "Employees can view own assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can update own assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can update own assignment progress" ON public.task_assignments;
DROP POLICY IF EXISTS "Service role can manage assignments" ON public.task_assignments;
DROP POLICY IF EXISTS "Deny anonymous access to assignments" ON public.task_assignments;

-- Employees can view their own assignments
CREATE POLICY "Employees can view own assignments"
  ON public.task_assignments
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

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

-- ============================================================================
-- CREATE TASK_DAILY_UPDATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_daily_updates (
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
CREATE INDEX IF NOT EXISTS idx_task_daily_updates_assignment_id ON public.task_daily_updates(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_daily_updates_employee_id ON public.task_daily_updates(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_daily_updates_update_date ON public.task_daily_updates(update_date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_task_daily_updates_updated_at ON public.task_daily_updates;
CREATE TRIGGER update_task_daily_updates_updated_at
  BEFORE UPDATE ON public.task_daily_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for task_daily_updates
ALTER TABLE public.task_daily_updates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASK_DAILY_UPDATES RLS POLICIES
-- ============================================================================

-- Drop any existing policies (from migrations 021-025 if they were applied)
DROP POLICY IF EXISTS "Employees can view own daily updates" ON public.task_daily_updates;
DROP POLICY IF EXISTS "Employees can insert own daily updates" ON public.task_daily_updates;
DROP POLICY IF EXISTS "Service role can manage daily updates" ON public.task_daily_updates;
DROP POLICY IF EXISTS "Deny anonymous access to daily updates" ON public.task_daily_updates;

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
  WITH CHECK (
    employee_id = auth.uid()
    AND assignment_id IN (
      SELECT id FROM public.task_assignments 
      WHERE employee_id = auth.uid()
    )
  );

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

-- ============================================================================
-- CREATE TASK_ACTIVITY_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.task_activity_log (
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
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_assignment_id ON public.task_activity_log(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_created_at ON public.task_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_event_type ON public.task_activity_log(event_type);

-- Enable RLS for task_activity_log
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TASK_ACTIVITY_LOG RLS POLICIES
-- ============================================================================

-- Drop any existing policies (from migration 021 if it was applied)
DROP POLICY IF EXISTS "Employees can view activity log for their assignments" ON public.task_activity_log;
DROP POLICY IF EXISTS "Service role can manage activity logs" ON public.task_activity_log;
DROP POLICY IF EXISTS "Deny anonymous access to activity logs" ON public.task_activity_log;

-- Employees can view activity log for their assignments
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

-- ============================================================================
-- TASK_ASSIGNMENTS RLS POLICY - ROW-LEVEL AUTHORIZATION ONLY
-- ============================================================================

-- This policy allows employees to update their own assignments
-- Field-level protection is handled by triggers (no OLD/NEW in RLS)
CREATE POLICY "Employees can update own assignment progress"
  ON public.task_assignments
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    AND status NOT IN ('COMPLETED', 'CANCELLED')
  )
  WITH CHECK (
    employee_id = auth.uid()
    AND status NOT IN ('COMPLETED', 'CANCELLED')
    -- Validate progress and hours at RLS level
    AND (progress_percentage BETWEEN 0 AND 100)
    AND (actual_hours >= 0)
  );

-- ============================================================================
-- SECURITY TRIGERS
-- ============================================================================

-- Drop any existing triggers (from migrations 022-025 if they were applied)
DROP TRIGGER IF EXISTS protect_assignment_fields_on_update_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS protect_assignment_fields_on_insert_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS enforce_assignment_status_lifecycle_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS verify_daily_update_ownership_trigger ON public.task_daily_updates;

-- Drop any existing functions (from migrations 022-025 if they were applied)
DROP FUNCTION IF EXISTS protect_assignment_fields_on_update();
DROP FUNCTION IF EXISTS protect_assignment_fields_on_insert();
DROP FUNCTION IF EXISTS enforce_assignment_status_lifecycle();
DROP FUNCTION IF EXISTS verify_daily_update_ownership();

-- 1. BEFORE UPDATE trigger - field protection with NULL-safe detection
CREATE OR REPLACE FUNCTION protect_assignment_fields_on_update()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- NULL-safe service-role detection
  -- COALESCE ensures FALSE is the default, NULL never grants privileges
  SELECT COALESCE(
    auth.jwt() ->> 'role' = 'service_role',
    FALSE
  ) INTO is_service_role;
  
  -- NULL-safe SUPER_ADMIN detection
  -- COALESCE ensures FALSE when auth.uid() is NULL or profile not found
  SELECT COALESCE(
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'),
    FALSE
  ) INTO is_super_admin;
  
  -- Only apply restrictions to non-privileged users
  IF NOT (is_service_role OR is_super_admin) THEN
    -- Protect employee_id (ownership)
    IF OLD.employee_id IS DISTINCT FROM NEW.employee_id THEN
      RAISE EXCEPTION 'Cannot modify employee_id';
    END IF;
    
    -- Protect assigned_by (creator)
    IF OLD.assigned_by IS DISTINCT FROM NEW.assigned_by THEN
      RAISE EXCEPTION 'Cannot modify assigned_by';
    END IF;
    
    -- Protect task_id (assignment relationship)
    IF OLD.task_id IS DISTINCT FROM NEW.task_id THEN
      RAISE EXCEPTION 'Cannot modify task_id';
    END IF;
    
    -- Protect assigned_at (assignment timestamp)
    IF OLD.assigned_at IS DISTINCT FROM NEW.assigned_at THEN
      RAISE EXCEPTION 'Cannot modify assigned_at';
    END IF;
    
    -- Protect submitted_at (completion submission metadata)
    IF OLD.submitted_at IS DISTINCT FROM NEW.submitted_at THEN
      RAISE EXCEPTION 'Cannot modify submitted_at';
    END IF;
    
    -- Protect completion_notes (completion metadata)
    IF OLD.completion_notes IS DISTINCT FROM NEW.completion_notes THEN
      RAISE EXCEPTION 'Cannot modify completion_notes';
    END IF;
    
    -- Protect reviewer fields
    IF OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by OR
       OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at OR
       OLD.review_notes IS DISTINCT FROM NEW.review_notes THEN
      RAISE EXCEPTION 'Cannot modify review fields';
    END IF;
    
    -- Protect dates (start_date, due_date)
    IF OLD.start_date IS DISTINCT FROM NEW.start_date OR
       OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      RAISE EXCEPTION 'Cannot modify assignment dates';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER protect_assignment_fields_on_update_trigger
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION protect_assignment_fields_on_update();

-- 2. BEFORE INSERT trigger - field protection with NULL-safe detection
CREATE OR REPLACE FUNCTION protect_assignment_fields_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- NULL-safe service-role detection
  SELECT COALESCE(
    auth.jwt() ->> 'role' = 'service_role',
    FALSE
  ) INTO is_service_role;
  
  -- NULL-safe SUPER_ADMIN detection
  SELECT COALESCE(
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'),
    FALSE
  ) INTO is_super_admin;
  
  IF NOT (is_service_role OR is_super_admin) THEN
    -- employee_id must match auth.uid() for self-assignment
    IF NEW.employee_id IS NOT NULL AND NEW.employee_id != auth.uid() THEN
      RAISE EXCEPTION 'Cannot assign to another employee';
    END IF;
    
    -- assigned_by must match auth.uid()
    IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by != auth.uid() THEN
      RAISE EXCEPTION 'Cannot set assigned_by to another user';
    END IF;
    
    -- Status must be ASSIGNED or IN_PROGRESS on INSERT
    IF NEW.status NOT IN ('ASSIGNED', 'IN_PROGRESS') THEN
      RAISE EXCEPTION 'Initial status must be ASSIGNED or IN_PROGRESS';
    END IF;
    
    -- Review fields must be NULL on INSERT
    IF NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.review_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Review fields must be NULL on INSERT';
    END IF;
    
    -- submitted_at must be NULL on INSERT (set by server during submission)
    IF NEW.submitted_at IS NOT NULL THEN
      RAISE EXCEPTION 'submitted_at must be NULL on INSERT';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER protect_assignment_fields_on_insert_trigger
  BEFORE INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION protect_assignment_fields_on_insert();

-- 3. Status lifecycle enforcement trigger with NULL-safe detection
CREATE OR REPLACE FUNCTION enforce_assignment_status_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- NULL-safe service-role detection
  SELECT COALESCE(
    auth.jwt() ->> 'role' = 'service_role',
    FALSE
  ) INTO is_service_role;
  
  -- NULL-safe SUPER_ADMIN detection
  SELECT COALESCE(
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN'),
    FALSE
  ) INTO is_super_admin;
  
  IF TG_OP = 'INSERT' THEN
    -- On INSERT, only allow ASSIGNED or IN_PROGRESS
    IF NEW.status NOT IN ('ASSIGNED', 'IN_PROGRESS') AND NOT (is_service_role OR is_super_admin) THEN
      RAISE EXCEPTION 'Initial assignment status must be ASSIGNED or IN_PROGRESS';
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- COMPLETED requires review fields
    IF NEW.status = 'COMPLETED' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL) THEN
      RAISE EXCEPTION 'COMPLETED status requires reviewed_by and reviewed_at';
    END IF;
    
    -- REVIEW status does NOT require review fields (for employee submission)
    -- But if review fields are being set, they must be set together
    IF NEW.status = 'REVIEW' AND (NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL) THEN
      IF NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL THEN
        RAISE EXCEPTION 'REVIEW status with review fields requires both reviewed_by and reviewed_at';
      END IF;
    END IF;
    
    -- Prevent non-privileged users from setting privileged statuses
    IF NEW.status IN ('COMPLETED', 'REVIEW', 'CANCELLED', 'REVISION_REQUESTED') AND 
       NOT (is_service_role OR is_super_admin) THEN
      RAISE EXCEPTION 'Only SUPER_ADMIN or service role can set status to %', NEW.status;
    END IF;
    
    -- Prevent reopening completed or cancelled assignments
    IF OLD.status IN ('COMPLETED', 'CANCELLED') AND NEW.status NOT IN ('COMPLETED', 'CANCELLED') AND
       NOT (is_service_role OR is_super_admin) THEN
      RAISE EXCEPTION 'Cannot reopen completed or cancelled assignment';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER enforce_assignment_status_lifecycle_trigger
  BEFORE INSERT OR UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_assignment_status_lifecycle();

-- 4. Daily update ownership trigger
CREATE OR REPLACE FUNCTION verify_daily_update_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.task_assignments 
    WHERE id = NEW.assignment_id 
    AND employee_id = NEW.employee_id
  ) THEN
    RAISE EXCEPTION 'Daily update assignment_id must belong to the employee';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER verify_daily_update_ownership_trigger
  BEFORE INSERT ON public.task_daily_updates
  FOR EACH ROW
  EXECUTE FUNCTION verify_daily_update_ownership();

-- ============================================================================
-- PROGRESS RANGE CONSTRAINT
-- ============================================================================

ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_progress_check;

ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_progress_check 
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- ============================================================================
-- BACKFILL EXISTING TASKS
-- ============================================================================
-- This migrates existing single-assignee tasks to the new assignment structure
-- Uses ON CONFLICT DO NOTHING to prevent duplicate backfills

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
FROM public.tasks t
WHERE t.assigned_to IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEPRECATION NOTES
-- ============================================================================
-- Migrations 021-025 are preserved in Git history for reference
-- This migration (026) consolidates the intended schema and security implementation
-- Do not apply migrations 022, 023, or 024 - they contain deprecated implementations
-- Migration 023 contains invalid SQL (OLD in RLS policy) and will fail execution
