-- Leave Requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
  CONSTRAINT reason_not_empty CHECK (TRIM(reason) <> '')
);

-- Create indexes
CREATE INDEX idx_leave_requests_profile_id ON public.leave_requests(profile_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_date_range ON public.leave_requests(start_date, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own leave requests
CREATE POLICY "Employees can view own leave requests"
  ON public.leave_requests
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Employees can create their own leave requests
CREATE POLICY "Employees can create own leave requests"
  ON public.leave_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND start_date >= (now() AT TIME ZONE 'Asia/Dhaka')::date  -- Cannot request leave in the past (Asia/Dhaka)
    AND end_date >= start_date
    AND TRIM(reason) <> ''
  );

-- Employees can cancel their own pending leave requests
CREATE POLICY "Employees can cancel own pending leave requests"
  ON public.leave_requests
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND status = 'PENDING'
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND status = 'CANCELLED'
  );

-- Service role can manage all leave requests
CREATE POLICY "Service role can manage leave requests"
  ON public.leave_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to leave requests"
  ON public.leave_requests
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.leave_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.leave_requests TO authenticated;

-- Function to check for overlapping leave requests
CREATE OR REPLACE FUNCTION check_overlapping_leave_requests(
  p_profile_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate that the caller is checking their own leave requests
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: can only check own leave requests';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.leave_requests lr
  WHERE lr.profile_id = p_profile_id
  AND lr.status IN ('PENDING', 'APPROVED')
  AND (p_exclude_id IS NULL OR lr.id != p_exclude_id)
  AND (
    (lr.start_date <= p_end_date AND lr.end_date >= p_start_date)
  );

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execution to authenticated role only
REVOKE EXECUTE ON FUNCTION public.check_overlapping_leave_requests(UUID, DATE, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_overlapping_leave_requests(UUID, DATE, DATE, UUID) TO authenticated;

-- Trigger function to prevent overlapping leave requests on insert
-- Uses advisory lock for concurrency safety
CREATE OR REPLACE FUNCTION prevent_overlapping_leave_requests()
RETURNS TRIGGER AS $$
DECLARE
  v_has_overlap BOOLEAN;
  v_lock_key BIGINT;
BEGIN
  -- Only check for overlaps on INSERT or when not cancelling/rejecting
  IF TG_OP = 'UPDATE' AND NEW.status IN ('CANCELLED', 'REJECTED') THEN
    RETURN NEW;
  END IF;

  -- Acquire advisory lock on profile_id to prevent concurrent overlapping inserts
  -- Use hashtextextended for deterministic 64-bit hash of UUID
  v_lock_key := hashtextextended(NEW.profile_id::text, 0);

  -- Try to acquire lock (transaction-scoped, waits until available)
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check for overlapping requests (excluding this one on update)
  SELECT check_overlapping_leave_requests(
    NEW.profile_id,
    NEW.start_date,
    NEW.end_date,
    NEW.id  -- NULL on insert, set on update
  ) INTO v_has_overlap;

  IF v_has_overlap THEN
    RAISE EXCEPTION 'Leave request overlaps with an existing request';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Add trigger to prevent overlapping requests
CREATE TRIGGER prevent_overlapping_leave_requests_trigger
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_overlapping_leave_requests();
