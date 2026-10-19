-- Note: RLS on storage.objects requires owner permissions
-- The policies below can be applied once RLS is enabled by the project owner
-- Run this in Supabase Dashboard SQL Editor if automatic push fails:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own photos
DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
CREATE POLICY "Users can upload own photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can read their own photos via signed URLs (server-side)
DROP POLICY IF EXISTS "Users can read own photos" ON storage.objects;
CREATE POLICY "Users can read own photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'employee-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Service role can manage all photos
DROP POLICY IF EXISTS "Service role can manage all photos" ON storage.objects;
CREATE POLICY "Service role can manage all photos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access to photos
DROP POLICY IF EXISTS "Deny anonymous photo access" ON storage.objects;
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
