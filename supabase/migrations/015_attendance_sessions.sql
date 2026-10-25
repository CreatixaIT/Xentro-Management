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
CREATE INDEX idx_attendance_sessions_open_sessions ON public.attendance_sessions(profile_id, sign_out_time) WHERE sign_out_time IS NULL;

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
    AND sign_in_time = NOW()  -- Must use current server time
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
  id UUID,
  sign_in_time TIMESTAMPTZ,
  business_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    sign_in_time,
    business_date
  FROM public.attendance_sessions
  WHERE profile_id = p_profile_id
  AND sign_out_time IS NULL
  ORDER BY sign_in_time DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Function to get daily attendance summary
CREATE OR REPLACE FUNCTION get_daily_attendance_summary(p_profile_id UUID, p_date DATE)
RETURNS TABLE (
  total_sessions INTEGER,
  total_duration_minutes NUMERIC,
  first_sign_in TIMESTAMPTZ,
  last_sign_out TIMESTAMPTZ,
  is_signed_in BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE sign_out_time IS NOT NULL)::INTEGER as total_sessions,
    COALESCE(SUM(duration_minutes), 0) as total_duration_minutes,
    MIN(sign_in_time) as first_sign_in,
    MAX(sign_out_time) as last_sign_out,
    BOOL_OR(sign_out_time IS NULL) as is_signed_in
  FROM public.attendance_sessions
  WHERE profile_id = p_profile_id
  AND business_date = p_date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
