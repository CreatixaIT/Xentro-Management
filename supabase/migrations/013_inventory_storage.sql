-- Create inventory photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-photos', 'inventory-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inventory photos
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload inventory photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos');

-- Allow authenticated users to view photos
CREATE POLICY "Authenticated users can view inventory photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'inventory-photos');

-- Allow authenticated users to update photos
CREATE POLICY "Authenticated users can update inventory photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  WITH CHECK (bucket_id = 'inventory-photos');

-- Allow service role full access
CREATE POLICY "Service role can manage inventory photos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'inventory-photos')
  WITH CHECK (bucket_id = 'inventory-photos');
