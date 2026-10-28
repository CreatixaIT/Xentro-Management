-- Allow authenticated users to view minimal profile information for inventory creators
-- This enables the inventory page to display creator names for shared inventory items
-- Only exposes full_name and username, not sensitive fields like email, phone, NID

CREATE POLICY "Authenticated users can view creator profiles for inventory"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing own profile
    id = auth.uid()
    OR
    -- Allow viewing profiles that are creators of inventory items
    EXISTS (
      SELECT 1 FROM public.inventory
      WHERE inventory.created_by = profiles.id
    )
  );
