-- Rate limiter table for API endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL, -- API endpoint name
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 minute'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint, window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_seconds INTEGER DEFAULT 60
) RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := NOW();
  v_window_end := NOW() + (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean up old entries
  DELETE FROM public.rate_limits
  WHERE window_end < NOW();

  -- Check existing entry
  SELECT request_count, window_end INTO v_current_count, v_reset_at
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > (NOW() - (p_window_seconds || ' seconds')::INTERVAL)
  FOR UPDATE;

  IF v_current_count IS NULL THEN
    -- First request in window
    INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start, window_end)
    VALUES (p_identifier, p_endpoint, 1, v_window_start, v_window_end);
    v_allowed := TRUE;
    v_remaining := p_max_requests - 1;
    v_reset_at := v_window_end;
  ELSIF v_current_count < p_max_requests THEN
    -- Increment counter
    UPDATE public.rate_limits
    SET request_count = request_count + 1,
        updated_at = NOW()
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start > (NOW() - (p_window_seconds || ' seconds')::INTERVAL);
    v_allowed := TRUE;
    v_remaining := p_max_requests - v_current_count - 1;
  ELSE
    -- Rate limit exceeded
    v_allowed := FALSE;
    v_remaining := 0;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function to authenticated role
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, service_role;

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Deny all other access
CREATE POLICY "Deny anonymous rate limit access"
  ON public.rate_limits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
