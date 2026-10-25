-- Ensure authenticated users can update inventory
-- This migration fixes the UPDATE RLS policy that may be blocking edits

DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.inventory;

CREATE POLICY "Authenticated users can update inventory"
  ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the grant is in place
GRANT UPDATE ON public.inventory TO authenticated;
