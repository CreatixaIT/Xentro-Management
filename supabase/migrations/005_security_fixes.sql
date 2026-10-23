-- Security fixes for RLS and rate limiter
-- Fixes RLS recursion in profiles UPDATE policy
-- Removes authenticated role access to rate limiter function

-- Create helper function to verify role/status haven't changed
-- This SECURITY DEFINER function has fixed search_path and auth.uid() check
CREATE OR REPLACE FUNCTION verify_profile_unchanged_fields(
  p_id UUID,
  p_new_role TEXT,
  p_new_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_role TEXT;
  v_current_status TEXT;
BEGIN
  -- Verify the user is updating their own profile
  IF auth.uid() IS DISTINCT FROM p_id THEN
    RETURN FALSE;
  END IF;

  -- Get current role and status (bypasses RLS via SECURITY DEFINER)
  SELECT role, status INTO v_current_role, v_current_status
  FROM public.profiles
  WHERE id = p_id;

  -- Ensure role and status haven't changed
  RETURN v_current_role = p_new_role AND v_current_status = p_new_status;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Fix profiles UPDATE policy to use helper function
-- This prevents RLS recursion and correctly blocks role/status changes
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND verify_profile_unchanged_fields(id, role, status)
  );

-- Revoke execute on rate limiter from authenticated role
-- Only service_role should call this function (server-side only)
REVOKE EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM authenticated, anon, public;
