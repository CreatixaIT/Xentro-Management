-- Password reset request table
CREATE TABLE public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_password_reset_requests_profile_id ON public.password_reset_requests(profile_id);
CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_requested_at ON public.password_reset_requests(requested_at DESC);

-- Function to update updated_at timestamp
CREATE TRIGGER update_password_reset_requests_updated_at
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Employees can only view their own pending requests
CREATE POLICY "Employees can view own reset requests"
  ON public.password_reset_requests
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Employees can create reset requests for themselves
CREATE POLICY "Employees can create own reset request"
  ON public.password_reset_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Service role can manage all requests (for admin operations)
CREATE POLICY "Service role can manage all reset requests"
  ON public.password_reset_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to reset requests"
  ON public.password_reset_requests
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.password_reset_requests TO service_role;
GRANT SELECT, INSERT ON public.password_reset_requests TO authenticated;
