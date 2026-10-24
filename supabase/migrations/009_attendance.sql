-- Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  work_duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'ABSENT' CHECK (status IN ('ABSENT', 'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, business_date)
);

-- Create indexes
CREATE INDEX idx_attendance_profile_id ON public.attendance(profile_id);
CREATE INDEX idx_attendance_business_date ON public.attendance(business_date);
CREATE INDEX idx_attendance_status ON public.attendance(status);

-- Trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view their own attendance
CREATE POLICY "Employees can view own attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Employees can create their own attendance
CREATE POLICY "Employees can create own attendance"
  ON public.attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Employees can update their own attendance (time_in, time_out only)
CREATE POLICY "Employees can update own attendance"
  ON public.attendance
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Service role can manage all attendance
CREATE POLICY "Service role can manage attendance"
  ON public.attendance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to attendance"
  ON public.attendance
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.attendance TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
