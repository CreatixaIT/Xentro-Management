-- Fix the UPDATE RLS policy for inventory
-- The policy has qual = null which means USING is null instead of true
-- This causes UPDATE to fail even with WITH CHECK = true

DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.inventory;

CREATE POLICY "Authenticated users can update inventory"
  ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the grant is in place
GRANT UPDATE ON public.inventory TO authenticated;
