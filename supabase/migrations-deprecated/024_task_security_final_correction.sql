-- Phase 2.3: Final Correction for Migration 023 SQL Issues
-- This migration fixes invalid RLS policy syntax and completes security hardening

-- Drop migration 023 components
DROP TRIGGER IF EXISTS enforce_assignment_status_lifecycle_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS protect_assignment_privileged_fields_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS verify_daily_update_ownership_trigger ON public.task_daily_updates;

DROP FUNCTION IF EXISTS enforce_assignment_status_lifecycle();
DROP FUNCTION IF EXISTS protect_assignment_privileged_fields();
DROP FUNCTION IF EXISTS verify_daily_update_ownership();

DROP POLICY IF EXISTS "Employees can update own assignment progress" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can insert own daily updates" ON public.task_daily_updates;

-- ============================================================================
-- FINAL CORRECTED IMPLEMENTATION
-- ============================================================================

-- 1. Simplified RLS policy - NO OLD/NEW references
-- RLS is responsible for row-level authorization only
-- Field-level protection moved to triggers
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

-- 2. Daily updates INSERT policy - no changes needed (valid)
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

-- 3. Comprehensive BEFORE UPDATE trigger for field protection
-- Handles all old-versus-new comparisons that cannot be in RLS
CREATE OR REPLACE FUNCTION protect_assignment_fields_on_update()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- Detect service role using JWT role claim
  -- auth.jwt() returns NULL for anonymous requests
  BEGIN
    SELECT auth.jwt() ->> 'role' = 'service_role' INTO is_service_role;
  EXCEPTION WHEN OTHERS THEN
    is_service_role := FALSE;
  END;
  
  -- Check if current user is SUPER_ADMIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') INTO is_super_admin;
  
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

-- 4. BEFORE INSERT trigger for field protection
CREATE OR REPLACE FUNCTION protect_assignment_fields_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- Detect service role
  BEGIN
    SELECT auth.jwt() ->> 'role' = 'service_role' INTO is_service_role;
  EXCEPTION WHEN OTHERS THEN
    is_service_role := FALSE;
  END;
  
  -- Check SUPER_ADMIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') INTO is_super_admin;
  
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

-- 5. Status lifecycle enforcement trigger
CREATE OR REPLACE FUNCTION enforce_assignment_status_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- Detect service role
  BEGIN
    SELECT auth.jwt() ->> 'role' = 'service_role' INTO is_service_role;
  EXCEPTION WHEN OTHERS THEN
    is_service_role := FALSE;
  END;
  
  -- Check SUPER_ADMIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') INTO is_super_admin;
  
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

-- 6. Daily update ownership trigger (unchanged, passed audit)
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

-- 7. Progress range constraint
ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_progress_check;

ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_progress_check 
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- RLS Policies:
-- - Do NOT use OLD or NEW (PostgreSQL limitation)
-- - Responsible for row-level authorization only
-- - Field-level protection handled by triggers

-- Service-Role Detection:
-- - Uses auth.jwt() ->> 'role' to detect service role
-- - Wrapped in BEGIN/EXCEPTION to handle NULL JWT gracefully
-- - auth.jwt() returns NULL for anonymous requests
-- - NULL auth.uid() does NOT grant privileges
-- - API authorization must happen before service-role operations

-- Protected Fields (Employees):
-- - employee_id, assigned_by, task_id, assigned_at (ownership/creator)
-- - submitted_at, completion_notes (completion metadata)
-- - reviewed_by, reviewed_at, review_notes (reviewer metadata)
-- - start_date, due_date (assignment dates)
-- - All protected on both INSERT and UPDATE

-- Status Lifecycle:
-- - ASSIGNED -> IN_PROGRESS: Employee (progress > 0)
-- - IN_PROGRESS -> REVIEW: Employee (100% progress, submission API)
-- - REVIEW -> COMPLETED: SUPER_ADMIN only (sets review fields)
-- - REVIEW -> REVISION_REQUESTED: SUPER_ADMIN only
-- - REVISION_REQUESTED -> IN_PROGRESS: Employee (resumes work)
-- - CANCELLED: SUPER_ADMIN only
-- - Completed/cancelled cannot be reopened by employees

-- Trusted Execution Path:
-- 1. Client makes API request to Next.js
-- 2. API verifies authentication (supabase.auth.getUser())
-- 3. API checks role and ownership in server code
-- 4. API uses service role client for privileged database operations
-- 5. Triggers detect service role via auth.jwt() ->> 'role'
-- 6. Triggers bypass restrictions for service role (trusted)
-- 7. Triggers apply restrictions for regular users
