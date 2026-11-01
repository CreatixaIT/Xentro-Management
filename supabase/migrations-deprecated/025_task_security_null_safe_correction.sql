-- Phase 2.4: Fix NULL service-role detection and finalize security
-- This migration fixes nullable service-role detection and performs final hardening

-- Drop migration 024 components
DROP TRIGGER IF EXISTS protect_assignment_fields_on_update_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS protect_assignment_fields_on_insert_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS enforce_assignment_status_lifecycle_trigger ON public.task_assignments;
DROP TRIGGER IF EXISTS verify_daily_update_ownership_trigger ON public.task_daily_updates;

DROP FUNCTION IF EXISTS protect_assignment_fields_on_update();
DROP FUNCTION IF EXISTS protect_assignment_fields_on_insert();
DROP FUNCTION IF EXISTS enforce_assignment_status_lifecycle();
DROP FUNCTION IF EXISTS verify_daily_update_ownership();

DROP POLICY IF EXISTS "Employees can update own assignment progress" ON public.task_assignments;
DROP POLICY IF EXISTS "Employees can insert own daily updates" ON public.task_daily_updates;

-- ============================================================================
-- FINAL CORRECTED IMPLEMENTATION WITH NULL-SAFE DETECTION
-- ============================================================================

-- 1. RLS policy - row-level authorization only (no OLD/NEW)
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
    AND (progress_percentage BETWEEN 0 AND 100)
    AND (actual_hours >= 0)
  );

-- 2. Daily updates INSERT policy
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

-- 3. BEFORE UPDATE trigger - field protection with NULL-safe detection
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

-- 4. BEFORE INSERT trigger - field protection with NULL-safe detection
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

-- 5. Status lifecycle enforcement with NULL-safe detection
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
-- SECURITY DEFINER AUDIT
-- ============================================================================
-- All functions use:
-- - SECURITY DEFINER (bypasses RLS for authorization checks)
-- - SET search_path = public (explicit safe search path)
-- - COALESCE for NULL-safe boolean evaluation
-- - auth.uid() for authenticated user identity
-- - auth.jwt() ->> 'role' for service-role detection
-- - Explicit FALSE defaults, NULL never grants privileges

-- Authorization Logic:
-- 1. is_service_role = auth.jwt() ->> 'role' = 'service_role'
--    - Returns TRUE only when JWT role claim is 'service_role'
--    - Returns FALSE for NULL JWT (anonymous)
--    - Returns FALSE for regular authenticated users
-- 2. is_super_admin = EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
--    - Returns TRUE only when authenticated user is SUPER_ADMIN
--    - Returns FALSE for NULL auth.uid() (anonymous)
--    - Returns FALSE for non-SUPER_ADMIN users
-- 3. Restrictions apply when NOT (is_service_role OR is_super_admin)
--    - NULL values result in FALSE (due to COALESCE)
--    - Neither NULL nor anonymous grants privileges

-- Trusted Execution Path:
-- 1. Client API request
-- 2. API verifies authentication (supabase.auth.getUser())
-- 3. API checks role and ownership in server code
-- 4. API uses service role client for privileged operations
-- 5. Triggers detect service role via auth.jwt() ->> 'role'
-- 6. Service role bypasses trigger restrictions (trusted)
-- 7. Regular users subject to all restrictions
