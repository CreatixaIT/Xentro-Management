-- Enhance attendance table for daily sign-in/sign-out model
-- This migration adds triggers to auto-calculate duration and enforce business date

-- Add defaults for timestamps if not already present
ALTER TABLE public.attendance ALTER COLUMN time_in SET DEFAULT NOW();
ALTER TABLE public.attendance ALTER COLUMN time_out SET DEFAULT NOW();

-- Function to calculate work duration when time_out is set
CREATE OR REPLACE FUNCTION calculate_attendance_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.time_out IS NOT NULL AND NEW.time_in IS NOT NULL THEN
    -- Calculate duration in minutes
    NEW.work_duration_minutes = EXTRACT(EPOCH FROM (NEW.time_out - NEW.time_in)) / 60;
    
    -- Update status based on duration (optional enhancement)
    IF NEW.work_duration_minutes >= 480 THEN  -- 8 hours
      NEW.status = 'PRESENT';
    ELSIF NEW.work_duration_minutes >= 240 THEN  -- 4 hours
      NEW.status = 'HALF_DAY';
    ELSE
      NEW.status = 'LATE';
    END IF;
  ELSIF NEW.time_in IS NOT NULL AND NEW.time_out IS NULL THEN
    -- Signed in but not out
    NEW.status = 'PRESENT';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Trigger to auto-calculate duration on insert/update
CREATE TRIGGER calculate_attendance_duration_trigger
  BEFORE INSERT OR UPDATE OF time_in, time_out ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_duration();

-- Function to get today's attendance for a user
CREATE OR REPLACE FUNCTION get_today_attendance(p_profile_id UUID)
RETURNS TABLE (
  attendance_id UUID,
  attendance_time_in TIMESTAMPTZ,
  attendance_time_out TIMESTAMPTZ,
  attendance_duration_minutes INTEGER,
  attendance_status TEXT
) AS $$
DECLARE
  v_today_date DATE;
BEGIN
  -- Validate that the caller is requesting their own attendance
  IF auth.uid() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: can only view own attendance';
  END IF;

  -- Get today's business date in Asia/Dhaka
  v_today_date := (CURRENT_DATE AT TIME ZONE 'Asia/Dhaka')::DATE;

  RETURN QUERY
  SELECT
    a.id AS attendance_id,
    a.time_in AS attendance_time_in,
    a.time_out AS attendance_time_out,
    a.work_duration_minutes AS attendance_duration_minutes,
    a.status AS attendance_status
  FROM public.attendance a
  WHERE a.profile_id = p_profile_id
  AND a.business_date = v_today_date;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execution to authenticated role only
REVOKE EXECUTE ON FUNCTION public.get_today_attendance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_attendance(UUID) TO authenticated;

-- Update RLS policy to prevent creating attendance for past dates
DROP POLICY IF EXISTS "Employees can create own attendance" ON public.attendance;

CREATE POLICY "Employees can create own attendance"
  ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND business_date >= (CURRENT_DATE AT TIME ZONE 'Asia/Dhaka')::DATE  -- Cannot create past attendance
    AND time_in IS NOT NULL  -- Must have time_in
  );

-- Update RLS policy to prevent updating attendance after sign-out
DROP POLICY IF EXISTS "Employees can update own attendance" ON public.attendance;

CREATE POLICY "Employees can update own attendance"
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    AND time_out IS NULL  -- Can only update before sign-out
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND time_out IS NOT NULL  -- Must be signing out
    AND time_out >= time_in  -- Cannot sign out before sign in
  );
