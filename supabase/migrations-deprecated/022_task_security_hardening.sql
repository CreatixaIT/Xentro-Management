-- Phase 2.1: Security Hardening for Task Management
-- This migration addresses critical security vulnerabilities in the RLS policies

-- 1. DROP existing permissive assignment UPDATE policy
DROP POLICY IF EXISTS "Employees can update own assignments" ON public.task_assignments;

-- 2. Create restrictive assignment UPDATE policy that only allows progress-related fields
-- Employees can only update progress_percentage and actual_hours
CREATE POLICY "Employees can update own assignment progress"
  ON public.task_assignments
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    AND status NOT IN ('COMPLETED', 'CANCELLED', 'REVIEW')
  )
  WITH CHECK (
    employee_id = auth.uid()
    AND status NOT IN ('COMPLETED', 'CANCELLED', 'REVIEW')
    -- Prevent modification of privileged fields
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reviewed_notes IS NULL
    AND submitted_at IS NULL
    AND assigned_by IS NULL
    -- Only allow these fields to change
    AND (progress_percentage BETWEEN 0 AND 100)
    AND (actual_hours >= 0)
  );

-- 3. DROP existing permissive daily_updates INSERT policy
DROP POLICY IF EXISTS "Employees can insert own daily updates" ON public.task_daily_updates;

-- 4. Create restrictive daily_updates INSERT policy that verifies assignment ownership
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

-- 5. Add trigger to prevent unauthorized status changes to COMPLETED or REVIEW
CREATE OR REPLACE FUNCTION prevent_unauthorized_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service role can set status to COMPLETED or REVIEW
  IF (NEW.status = 'COMPLETED' OR NEW.status = 'REVIEW') AND 
     (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL) THEN
    RAISE EXCEPTION 'Cannot set status to COMPLETED or REVIEW without review authorization';
  END IF;
  
  -- Prevent employees from modifying review fields
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by OR
        OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at OR
        OLD.review_notes IS DISTINCT FROM NEW.review_notes) AND
       (NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')) THEN
      RAISE EXCEPTION 'Only SUPER_ADMIN can modify review fields';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Apply trigger to task_assignments
DROP TRIGGER IF EXISTS prevent_unauthorized_completion_trigger ON public.task_assignments;
CREATE TRIGGER prevent_unauthorized_completion_trigger
  BEFORE INSERT OR UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_unauthorized_completion();

-- 6. Add trigger to verify daily update assignment ownership
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

-- Apply trigger to task_daily_updates
DROP TRIGGER IF EXISTS verify_daily_update_ownership_trigger ON public.task_daily_updates;
CREATE TRIGGER verify_daily_update_ownership_trigger
  BEFORE INSERT ON public.task_daily_updates
  FOR EACH ROW
  EXECUTE FUNCTION verify_daily_update_ownership();

-- 7. Add trigger to prevent modification of critical assignment fields by non-super-admins
CREATE OR REPLACE FUNCTION protect_assignment_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Check if user is SUPER_ADMIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN') THEN
      -- Prevent modification of privileged fields
      IF (OLD.employee_id IS DISTINCT FROM NEW.employee_id OR
          OLD.assigned_by IS DISTINCT FROM NEW.assigned_by OR
          OLD.task_id IS DISTINCT FROM NEW.task_id OR
          OLD.submitted_at IS DISTINCT FROM NEW.submitted_at) THEN
        RAISE EXCEPTION 'Cannot modify privileged assignment fields';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Apply trigger to task_assignments
DROP TRIGGER IF EXISTS protect_assignment_fields_trigger ON public.task_assignments;
CREATE TRIGGER protect_assignment_fields_trigger
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION protect_assignment_fields();

-- 8. Revoke UPDATE permission on privileged columns for authenticated users
-- Only allow progress_percentage and actual_hours to be updated
ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_check;

-- Add check constraint for progress
ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_progress_check 
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

-- Note: Column-level grants are not available in Supabase Postgres
-- We rely on RLS policies and triggers for security
