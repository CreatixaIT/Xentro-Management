# Inventory Update 404 Error - RLS Policy Fix

**Date**: 2026-10-25
**Commit**: `a5a7b55`
**Repository**: CreatixaIT/Xentro-Management.git
**Branch**: main

## Current Error

When clicking Edit on an existing inventory item, changing a field, and clicking Save:
`Error: Item not found or update not permitted`

The inventory list loads existing records correctly, but editing fails.

## Root Cause

The UPDATE RLS policy for the inventory table was blocking authenticated users from updating records. 

**Evidence:**
- Migration 012 created the UPDATE RLS policy conditionally with `IF NOT EXISTS`
- If an older policy existed with different logic, it wouldn't be updated
- The policy may have been created with incorrect conditions
- The server client uses the publishable key (anon key) which relies on RLS
- SELECT RLS policy allows authenticated users to view inventory
- UPDATE RLS policy was not allowing authenticated users to update

**Migration 012 Analysis:**
```sql
-- Create update policy if not exists
IF NOT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'inventory' 
    AND policyname = 'Authenticated users can update inventory'
) THEN
  CREATE POLICY "Authenticated users can update inventory"
    ON public.inventory
    FOR UPDATE
    TO authenticated
    WITH CHECK (true);
END IF;
```

This only creates the policy if it doesn't exist. If a policy existed with different logic, it would not be updated.

## Fix Applied

**Migration: supabase/migrations/014_fix_inventory_update_rls.sql**

Created a new migration that:
1. Drops any existing "Authenticated users can update inventory" policy
2. Creates a new policy that allows authenticated users to UPDATE inventory
3. Ensures the UPDATE grant is in place
4. Uses `USING (true) WITH CHECK (true)` to allow all authenticated users

```sql
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.inventory;

CREATE POLICY "Authenticated users can update inventory"
  ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON public.inventory TO authenticated;
```

**File: src/app/api/inventory/[id]/route.ts**
- Removed the service role bypass approach
- Kept comprehensive diagnostics in place
- Continues to use the authenticated server client (correct approach)

**File: src/lib/supabase/service-role.ts**
- Restored the helper (needed by admin routes)

## Why This Works

- Dropping and recreating the policy ensures it's created with the correct conditions
- `USING (true) WITH CHECK (true)` allows all authenticated users to update
- The grant ensures the database permissions are in place
- The authenticated client can now successfully update records
- RLS is preserved (not disabled), just corrected

## Files Changed

**Modified:**
- `src/app/api/inventory/[id]/route.ts` - Removed service role bypass, kept diagnostics
- `src/lib/supabase/service-role.ts` - Restored (needed by admin routes)

**New:**
- `supabase/migrations/014_fix_inventory_update_rls.sql` - Migration to fix RLS

## Migration Application

**Required Manual Step:**

The migration must be applied manually via the Supabase Dashboard:

1. Go to Supabase Dashboard
2. Navigate to your project
3. Go to Database > Migrations
4. Click "New Migration"
5. Copy and paste the SQL from `supabase/migrations/014_fix_inventory_update_rls.sql`
6. Click "Apply"

Alternatively, apply via SQL Editor:
1. Go to Database > SQL Editor
2. Paste the SQL from the migration file
3. Click "Run"

## Test Results

**Type Checking:**
```bash
npm run typecheck  # ✅ Success
```

**Build:**
```bash
npm run build      # ✅ Success (35 routes)
```

## Verification Status

**Database Test:** Not performed - Migration needs to be applied manually.

**What Changed:**
- RLS policy for UPDATE will be corrected after migration is applied
- All authenticated users will be able to update inventory records
- RLS is preserved (not disabled)

**What Was Preserved:**
- All authentication checks
- All other RLS policies
- All field validation
- All diagnostic logging
- Photo upload handling
- All update data field logic

## Git Status

**Commit Hash:** `a5a7b55`
**Commit Message:** "Fix inventory update 404 error with RLS policy migration"
**Push Result:** Pushed to main branch

## Next Steps

**Required Before Marking Complete:**

1. **Apply Migration Manually:**
   - Go to Supabase Dashboard > Database > SQL Editor
   - Run the SQL from `supabase/migrations/014_fix_inventory_update_rls.sql`

2. **Verify Vercel Deployment** - Check dashboard for build status

3. **Test Edit Functionality in Production:**
   - Edit an existing inventory item
   - Check server logs for detailed diagnostics
   - Verify the edit saves successfully
   - Reload the page and verify changes persist

4. **Test Error Cases:**
   - Test with an invalid/nonexistent item ID
   - Verify it returns an appropriate error
   - Verify RLS policies are still enforced for unauthorized users

## Conclusion

**Root Cause:** The UPDATE RLS policy for inventory was blocking authenticated users from updating records. The policy was created conditionally and may have incorrect conditions.

**Fix:** Created migration 014 that drops and recreates the UPDATE RLS policy with correct conditions (`USING (true) WITH CHECK (true)`), ensuring all authenticated users can update inventory.

**Status:** ⏳ **FIX IMPLEMENTED** - Awaiting manual migration application and production verification.

**IMPORTANT:** The migration must be applied manually via the Supabase Dashboard SQL Editor before the fix will work in production.
