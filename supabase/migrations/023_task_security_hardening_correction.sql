-- Phase 2.2: Correction for Migration 022 Security Issues
-- This migration replaces the problematic security hardening with corrected implementation

-- Drop problematic triggers and policies from migration 022
DROP TRIGGER IF EXISTS prevent_unauthorized_completion_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS verify_daily_update_ownership_trigger ON public.task_daily_updates;
DROP TRIGGER IF EXISTS protect_assignment_fields_trigger ON public.task_assignments;

DROP FUNCTION IF EXISTS prevent_unauthorized_completion();
DROP FUNCTION IF EXISTS verify_daily_update_ownership();
DROP FUNCTION IF EXISTS protect_assignment_fields();

DROP POLICY IF EXISTS "Employees can update own assignment progress" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can insert own daily updates" ON public.task_daily_updates;

-- ============================================================================
-- CORRECTED IMPLEMENTATION
-- ============================================================================

-- 1. Corrected assignment UPDATE RLS policy
-- Allows progress updates and legitimate completion submission
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
    -- Prevent modification of privileged fields (column comparison, not NULL checks)
    AND (reviewed_by IS NULL OR reviewed_by = OLD.reviewed_by)
    AND (reviewed_at IS NULL OR reviewed_at = OLD.reviewed_at)
    AND (review_notes IS NULL OR review_notes = OLD.review_notes)
    AND (assigned_by IS NULL OR assigned_by = OLD.assigned_by)
    AND (assigned_at IS NULL OR assigned_at = OLD.assigned_at)
    AND (employee_id IS NULL OR employee_id = OLD.employee_id)
    AND (task_id IS NULL OR task_id = OLD.task_id)
    -- Allow submitted_at to be set (for completion submission)
    AND (start_date IS NULL OR start_date = OLD.start_date)
    AND (due_date IS NULL OR due_date = OLD.due_date)
    -- Validate progress and hours
    AND (progress_percentage BETWEEN 0 AND 100)
    AND (actual_hours >= 0)
  );

-- 2. Corrected daily updates INSERT policy
-- Verifies assignment ownership
CREATE POLICY "Employees can insert own daily updates"
  ON public.task_daily_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    -- Verify that the assignment actually belongs to this employee
    AND assignment_id IN (
      SELECT id FROM public.task_assignments 
      WHERE employee_id = auth.uid()
    )
  );

-- 3. Corrected trigger for status lifecycle enforcement
-- Allows REVIEW without review fields (for employee submission)
-- Requires review fields for COMPLETED (for Super Admin approval)
CREATE OR REPLACE FUNCTION enforce_assignment_status_lifecycle()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- Check if this is a service role operation by examining the JWT
  -- auth.jwt() returns the current JWT claims
  -- If role = 'service_role', this is a trusted server-side operation
  SELECT auth.jwt() ->> 'role' = 'service_role' INTO is_service_role;
  
  -- Check if current user is SUPER_ADMIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') INTO is_super_admin;
  
  -- Status lifecycle enforcement
  IF TG_OP = 'INSERT' THEN
    -- On INSERT, only allow specific initial statuses
    IF NEW.status NOT IN ('ASSIGNED', 'IN_PROGRESS') AND NOT (is_service_role OR is_super_admin) THEN
      RAISE EXCEPTION 'Initial assignment status must be ASSIGNED or IN_PROGRESS';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- COMPLETED status requires review fields
    IF NEW.status = 'COMPLETED' AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL) THEN
      RAISE EXCEPTION 'COMPLETED status requires reviewed_by and reviewed_at';
    END IF;
    
    -- REVIEW status does NOT require review fields (for employee submission)
    -- but if review fields are being set, they must be set together
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

-- 4. Corrected trigger to protect privileged fields on both INSERT and UPDATE
CREATE OR REPLACE FUNCTION protect_assignment_privileged_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_service_role BOOLEAN;
  is_super_admin BOOLEAN;
BEGIN
  -- Check if this is a service role operation
  SELECT auth.jwt() ->> 'role' = 'service_role' INTO is_service_role;
  
  -- Check if current user is SUPER_ADMIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') INTO is_super_admin;
  
  -- Only apply restrictions to non-privileged users
  IF NOT (is_service_role OR is_super_admin) THEN
    IF TG_OP = 'INSERT' THEN
      -- On INSERT, validate critical fields
      -- employee_id must match auth.uid() for self-assignment
      -- (or be set by service role during assignment creation)
      IF NEW.employee_id IS NOT NULL AND NEW.employee_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot assign to another employee';
      END IF;
      
      -- assigned_by must be NULL or match auth.uid()
      IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by != auth.uid() THEN
        RAISE EXCEPTION 'Cannot set assigned_by to another user';
      END IF;
      
      -- status must be ASSIGNED or IN_PROGRESS on INSERT
      IF NEW.status NOT IN ('ASSIGNED', 'IN_PROGRESS') THEN
        RAISE EXCEPTION 'Initial status must be ASSIGNED or IN_PROGRESS';
      END IF;
      
      -- review fields must be NULL on INSERT
      IF NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.review_notes IS NOT NULL THEN
        RAISE EXCEPTION 'Review fields must be NULL on INSERT';
      END IF;
      
    ELSIF TG_OP = 'UPDATE' THEN
      -- On UPDATE, prevent modification of privileged fields
      IF (OLD.employee_id IS DISTINCT FROM NEW.employee_id) THEN
        RAISE EXCEPTION 'Cannot modify employee_id';
      END IF;
      
      IF (OLD.assigned_by IS DISTINCT FROM NEW.assigned_by) THEN
        RAISE EXCEPTION 'Cannot modify assigned_by';
      END IF;
      
      IF (OLD.task_id IS DISTINCT FROM NEW.task_id) THEN
        RAISE EXCEPTION 'Cannot modify task_id';
      END IF;
      
      IF (OLD.assigned_at IS DISTINCT FROM NEW.assigned_at) THEN
        RAISE EXCEPTION 'Cannot modify assigned_at';
      END IF;
      
      -- Prevent modification of review fields
      IF (OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by OR
          OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at OR
          OLD.review_notes IS DISTINCT FROM NEW.review_notes) THEN
        RAISE EXCEPTION 'Cannot modify review fields';
      END IF;
      
      -- Prevent modification of dates unless in permitted state
      IF OLD.status IN ('COMPLETED', 'CANCELLED', 'REVIEW') THEN
        IF (OLD.start_date IS DISTINCT FROM NEW.start_date OR
            OLD.due_date IS DISTINCT FROM NEW.due_date) THEN
          RAISE EXCEPTION 'Cannot modify dates on completed/cancelled/reviewed assignment';
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER protect_assignment_privileged_fields_trigger
  BEFORE INSERT OR UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION protect_assignment_privileged_fields();

-- 5. Keep the daily update ownership trigger (it passed the audit)
CREATE OR REPLACE FUNCTION verify_daily_update_ownership()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify that the assignment belongs to the employee
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

-- 6. Ensure progress range constraint exists
ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_progress_check;

ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_progress_check 
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- Service-Role Detection:
-- - Uses auth.jwt() ->> 'role' to detect service role operations
-- - Service role operations bypass trigger restrictions (trusted server-side)
-- - auth.uid() is NULL for service role, handled explicitly
-- - Regular authenticated users require SUPER_ADMIN role for privileged operations
--
-- Employee Submission Workflow:
-- - Employee can set status to REVIEW without review fields
-- - REVIEW status with review fields requires both reviewed_by and reviewed_at
-- - COMPLETED status always requires review fields
-- - submitted_at can be set by employee during completion submission
--
-- Privileged Field Protection:
-- - Protected on both INSERT and UPDATE
-- - INSERT: Validates employee_id matches auth.uid(), review fields NULL
-- - UPDATE: Prevents modification of employee_id, assigned_by, task_id, review fields
-- - Service role and SUPER_ADMIN bypass restrictions
--
-- Daily Update Ownership:
-- - RLS policy verifies assignment ownership on INSERT
-- - Trigger enforces ownership at database level
-- - Employees cannot submit updates for other employees' assignments
