-- Note: This migration assumes the bucket 'employee-photos' has been created manually
-- in the Supabase dashboard or via CLI before applying this migration.
-- Run: supabase storage new employee-photos

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own photos
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can read their own photos via signed URLs (server-side)
CREATE POLICY "Users can read own photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'employee-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Service role can manage all photos
CREATE POLICY "Service role can manage all photos"
  ON storage.objects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Deny anonymous access to photos
CREATE POLICY "Deny anonymous photo access"
  ON storage.objects
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO service_role;
GRANT SELECT, INSERT ON storage.objects TO authenticated;
