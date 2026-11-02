-- Phase 2.11: Fix profiles RLS recursion and Super Admin task approval
-- This migration fixes infinite RLS recursion in profiles and ensures ACTIVE SUPER_ADMIN accounts can approve tasks

-- ============================================================================
-- PART 1: Create dedicated authorization helper function
-- ============================================================================

-- Create helper function to check if a user is an active SUPER_ADMIN
-- SECURITY DEFINER with empty search_path to prevent recursion
CREATE OR REPLACE FUNCTION public.is_active_super_admin(p_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id
    AND role = 'SUPER_ADMIN'
    AND status = 'ACTIVE'
  );
$$;

-- Grant EXECUTE to authenticated and service_role only
REVOKE ALL ON FUNCTION public.is_active_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_super_admin(uuid) TO authenticated, service_role;

-- ============================================================================
-- PART 2: Fix recursive profiles RLS policy
-- ============================================================================

-- Drop the recursive policy from migration 018
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;

-- Create corrected policy using the helper function
CREATE POLICY "Super Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_active_super_admin(auth.uid()));

-- ============================================================================
-- PART 3: Fix task assignment status lifecycle trigger
-- ============================================================================

-- Drop the existing trigger function from migration 026
DROP TRIGGER IF EXISTS enforce_assignment_status_lifecycle_trigger ON public.task_assignments;
DROP FUNCTION IF EXISTS public.enforce_assignment_status_lifecycle();

-- Create corrected function using the helper function
CREATE OR REPLACE FUNCTION public.enforce_assignment_status_lifecycle()
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
  
  -- Use the helper function for SUPER_ADMIN detection (also checks ACTIVE status)
  SELECT public.is_active_super_admin(auth.uid()) INTO is_super_admin;
  
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
  EXECUTE FUNCTION public.enforce_assignment_status_lifecycle();

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
-- Changes made:
-- 1. Created public.is_active_super_admin() helper function
--    - SECURITY DEFINER with empty search_path (no recursion)
--    - Checks role = 'SUPER_ADMIN' AND status = 'ACTIVE'
--    - Fully qualified object references
--    - Owned by postgres (default)
--    - EXECUTE granted to authenticated and service_role only
--
-- 2. Fixed recursive profiles RLS policy
--    - Replaced EXISTS (SELECT 1 FROM profiles...) with helper function
--    - No infinite recursion
--    - Only ACTIVE SUPER_ADMIN can view all profiles
--
-- 3. Fixed task assignment status lifecycle trigger
--    - Replaced EXISTS (SELECT 1 FROM profiles...) with helper function
--    - Only ACTIVE SUPER_ADMIN can approve tasks
--    - Inactive SUPER_ADMIN cannot approve
--    - Preserved all existing restrictions
--
-- Preserved:
-- - Users can view own profile
-- - Users can update own profile
-- - verify_profile_unchanged_fields() trigger
-- - Service-role permissions
-- - Anonymous denial
-- - Employee assignment ownership
-- - Protected field triggers
-- - All status lifecycle rules
