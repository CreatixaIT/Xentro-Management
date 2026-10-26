-- Allow active Super Admins to view all profiles for admin operations
-- This enables the admin leave requests page to display employee names

CREATE POLICY "Super Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'SUPER_ADMIN'
      AND status = 'ACTIVE'
    )
  );
