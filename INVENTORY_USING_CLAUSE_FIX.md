# Inventory Update 404 - RLS USING Clause Fix

**Date**: 2026-10-25
**Commit**: `29fe8e9`
**Repository**: CreatixaIT/Xentro-Management.git
**Branch**: main

## Current Error

When clicking Edit on an existing inventory item, changing a field, and clicking Save:
`Error: Item not found or update not permitted`

## Root Cause Analysis

**User's Investigation Results:**
The database already has:
- `Authenticated users can update inventory`: UPDATE, `{authenticated}`, `qual = null`, `with_check = true`
- `Authenticated users can view inventory`: SELECT, `{authenticated}`, `qual = true`
- `Deny anonymous access to inventory`: ALL, `{anon}`, `qual = false`, `with_check = false`

**Critical Finding:**
The UPDATE RLS policy has `qual = null` (USING clause is null) instead of `qual = true`. Even though `with_check = true`, the null USING clause can cause UPDATE operations to fail.

**Explanation:**
- **USING clause**: Controls whether the UPDATE can modify existing rows that already exist
- **WITH CHECK clause**: Controls whether the new row values (after UPDATE) are allowed
- When USING is null, Postgres may block the UPDATE from modifying existing rows
- The SELECT policy has `qual = true`, which is why GET requests work
- The UPDATE policy has `qual = null`, which is why PATCH requests fail

## Fix Applied

**Migration: supabase/migrations/014_fix_inventory_update_rls.sql**

Updated the migration to explicitly set `USING (true)` in the UPDATE RLS policy:

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

Added a SELECT test before the UPDATE to verify authentication context:

```typescript
// Test: Can we query the item with SELECT?
console.log('Testing SELECT with same ID...');
const { data: testItem, error: testError } = await supabase
  .from('inventory')
  .select('id, name')
  .eq('id', id)
  .maybeSingle();

console.log('SELECT test result:', testItem);
console.log('SELECT test error:', testError);
```

This will show in the logs whether:
- SELECT works for the same ID (authentication context is valid)
- UPDATE fails (confirms RLS policy is the issue)

## Why This Works

- Setting `USING (true)` explicitly allows the UPDATE to modify existing rows
- The WITH CHECK clause allows the new row values after UPDATE
- Both clauses together allow authenticated users to update inventory records
- The SELECT test will confirm the authentication context is working

## Files Changed

**Modified:**
- `src/app/api/inventory/[id]/route.ts` - Added SELECT test before UPDATE
- `supabase/migrations/014_fix_inventory_update_rls.sql` - Added comment about USING clause

## Migration Application

**Required Manual Step:**

The migration must be applied manually via the Supabase Dashboard:

1. Go to Supabase Dashboard
2. Navigate to your project
3. Go to Database > SQL Editor
4. Copy and paste the SQL from `supabase/migrations/014_fix_inventory_update_rls.sql`
5. Click "Run"

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
- RLS policy for UPDATE will have explicit USING (true) clause after migration
- SELECT test added to verify authentication context
- All other RLS policies preserved

**What Was Preserved:**
- All authentication checks
- All other RLS policies
- All field validation
- All diagnostic logging
- Photo upload handling
- All update data field logic

## Git Status

**Commit Hash:** `29fe8e9`
**Commit Message:** "Fix inventory UPDATE RLS policy USING clause and add SELECT test"
**Push Result:** Pushed to main branch

## Next Steps

**Required Before Marking Complete:**

1. **Apply Migration Manually:**
   - Go to Supabase Dashboard > Database > SQL Editor
   - Run the SQL from `supabase/migrations/014_fix_inventory_update_rls.sql`

2. **Verify Vercel Deployment** - Check dashboard for build status

3. **Test Edit Functionality in Production:**
   - Edit an existing inventory item
   - Check server logs for SELECT test and UPDATE results
   - Verify the edit saves successfully
   - Reload the page and verify changes persist

4. **Analyze Logs:**
   - Check if SELECT test passes (confirms authentication works)
   - Check if UPDATE now succeeds (confirms RLS fix worked)

## Conclusion

**Root Cause:** The UPDATE RLS policy has `qual = null` (USING clause is null) instead of `qual = true`. This blocks UPDATE operations from modifying existing rows even though `with_check = true`.

**Fix:** Updated migration to explicitly set `USING (true)` in the UPDATE RLS policy, added SELECT test to verify authentication context.

**Status:** ⏳ **FIX IMPLEMENTED** - Awaiting manual migration application and production verification.

**IMPORTANT:** The migration must be applied manually via the Supabase Dashboard SQL Editor before the fix will work in production. The SELECT test in the logs will confirm whether the authentication context is working correctly.
