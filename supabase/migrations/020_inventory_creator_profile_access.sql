-- Allow authenticated users to view inventory creator names using a secure function
-- This function follows the SECURITY DEFINER pattern from migration 001
-- It validates auth.uid() and returns only minimal non-sensitive information
-- This avoids exposing sensitive profile columns through table-level RLS

-- Create a function to get inventory creator information
-- SECURITY DEFINER bypasses RLS to allow reading profiles of inventory creators
-- But the function validates authentication and only returns creator ID, full_name, username
-- This is safer than a table-level RLS policy which would expose all columns
CREATE OR REPLACE FUNCTION get_inventory_creator_names(creator_ids UUID[])
RETURNS TABLE (
  profile_id UUID,
  full_name TEXT,
  username TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
BEGIN
  -- Validate that the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate that input is not null
  IF creator_ids IS NULL THEN
    RETURN;
  END IF;
  
  -- Return only minimal creator information
  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.full_name,
    p.username
  FROM public.profiles p
  WHERE p.id = ANY(creator_ids);
END;
$$;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_inventory_creator_names(UUID[]) TO authenticated;

-- Revoke the previous policy if it exists (from the original migration 020)
DROP POLICY IF EXISTS "Authenticated users can view creator profiles for inventory" ON public.profiles;
