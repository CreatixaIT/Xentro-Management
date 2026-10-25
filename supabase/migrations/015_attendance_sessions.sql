-- Attendance Sessions table for multiple sign-in/sign-out per day
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sign_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sign_out_time TIMESTAMPTZ,
  business_date DATE NOT NULL GENERATED ALWAYS AS (DATE(sign_in_time AT TIME ZONE 'Asia/Dhaka')) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_attendance_sessions_profile_id ON public.attendance_sessions(profile_id);
CREATE INDEX idx_attendance_sessions_business_date ON public.attendance_sessions(business_date);
CREATE INDEX idx_attendance_sessions_sign_in_time ON public.attendance_sessions(sign_in_time);
-- Unique partial index to enforce one open session per employee
CREATE UNIQUE INDEX idx_attendance_sessions_unique_open_session
  ON public.attendance_sessions(profile_id)
  WHERE sign_out_time IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate session duration in minutes
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sign_out_time IS NOT NULL THEN
    -- Duration in minutes (can be fractional)
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.sign_out_time - NEW.sign_in_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add duration_minutes column if it doesn't exist
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC(10,2);

-- Trigger to auto-calculate duration on sign-out
CREATE TRIGGER calculate_session_duration_trigger
  BEFORE UPDATE OF sign_out_time ON public.attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();

-- Enable RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own attendance sessions
CREATE POLICY "Employees can view own attendance sessions"
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Employees can create their own attendance sessions (sign-in)
CREATE POLICY "Employees can create own attendance sessions"
  ON public.attendance_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND sign_out_time IS NULL  -- New sessions must start open
  );

-- Employees can update their own attendance sessions (sign-out only)
CREATE POLICY "Employees can update own attendance sessions"
  ON public.attendance_sessions
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND sign_out_time IS NULL  -- Can only update open sessions
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND sign_out_time IS NOT NULL  -- Must close the session
    AND sign_out_time >= sign_in_time  -- Cannot sign out before sign in
  );

-- Service role can manage all attendance sessions
CREATE POLICY "Service role can manage attendance sessions"
  ON public.attendance_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to attendance sessions"
  ON public.attendance_sessions
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.attendance_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.attendance_sessions TO authenticated;

-- Function to get current open session for a user
CREATE OR REPLACE FUNCTION get_current_open_session(p_profile_id UUID)
RETURNS TABLE (
  session_id UUID,
  session_sign_in_time TIMESTAMPTZ,
  session_business_date DATE
) AS $$
BEGIN
  -- Validate that the caller is requesting their own session
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view own sessions';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS session_id,
    s.sign_in_time AS session_sign_in_time,
    s.business_date AS session_business_date
  FROM public.attendance_sessions s
  WHERE s.profile_id = p_profile_id
  AND s.sign_out_time IS NULL
  ORDER BY s.sign_in_time DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execution to authenticated role only
REVOKE EXECUTE ON FUNCTION public.get_current_open_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_open_session(UUID) TO authenticated;

-- Function to get daily attendance summary
CREATE OR REPLACE FUNCTION get_daily_attendance_summary(p_profile_id UUID, p_date DATE)
RETURNS TABLE (
  summary_total_sessions INTEGER,
  summary_total_duration_minutes NUMERIC,
  summary_first_sign_in TIMESTAMPTZ,
  summary_last_sign_out TIMESTAMPTZ,
  summary_is_signed_in BOOLEAN
) AS $$
BEGIN
  -- Validate that the caller is requesting their own summary
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view own attendance summary';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE s.sign_out_time IS NOT NULL)::INTEGER AS summary_total_sessions,
    COALESCE(SUM(s.duration_minutes), 0) AS summary_total_duration_minutes,
    MIN(s.sign_in_time) AS summary_first_sign_in,
    MAX(s.sign_out_time) AS summary_last_sign_out,
    BOOL_OR(s.sign_out_time IS NULL) AS summary_is_signed_in
  FROM public.attendance_sessions s
  WHERE s.profile_id = p_profile_id
  AND s.business_date = p_date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execution to authenticated role only
REVOKE EXECUTE ON FUNCTION public.get_daily_attendance_summary(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_attendance_summary(UUID, DATE) TO authenticated;
