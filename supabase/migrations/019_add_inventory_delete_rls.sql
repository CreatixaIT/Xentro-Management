-- Add DELETE RLS policy for inventory table
-- Authenticated users can delete inventory items
-- Using the same permission model as INSERT and UPDATE policies (all authenticated users)

CREATE POLICY IF NOT EXISTS "Authenticated users can delete inventory"
  ON public.inventory
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant DELETE permission to authenticated users
GRANT DELETE ON public.inventory TO authenticated;
