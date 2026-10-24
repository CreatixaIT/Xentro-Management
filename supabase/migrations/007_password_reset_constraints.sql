-- Add unique constraint to prevent multiple unresolved reset requests per employee
-- This constraint only applies to requests that are not COMPLETED or REJECTED
-- A COMPLETED request means the password was successfully reset
-- A REJECTED request means the admin denied the request and the employee is locked until admin resolution

-- Add partial unique index for unresolved requests
-- This index will fail if there are existing duplicates, alerting us to resolve them manually
CREATE UNIQUE INDEX CONCURRENTLY idx_password_reset_requests_unique_unresolved
ON public.password_reset_requests(profile_id)
WHERE status IN ('PENDING', 'APPROVED');

-- Add helper function to check if employee can submit a new request
CREATE OR REPLACE FUNCTION can_submit_reset_request(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM public.password_reset_requests
  WHERE profile_id = p_profile_id
    AND status IN ('PENDING', 'APPROVED');

  RETURN v_pending_count = 0;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION can_submit_reset_request TO authenticated;
