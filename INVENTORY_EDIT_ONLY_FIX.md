# Inventory Edit/Save Error - Fix

**Date**: 2026-10-25
**Commit**: `0130adb`
**Repository**: CreatixaIT/Xentro-Management
**Branch**: main

## Current Error

When editing an existing inventory item and clicking Save, the application displays:
`Error: Update returned no data`

## Root Cause

The PATCH handler was using a two-step approach:
1. Pre-check with `.maybeSingle()` to verify the item exists using SELECT
2. Update with `.maybeSingle()` to update and return the row

This failed because:
- The SELECT and UPDATE RLS policies may be different
- The pre-check passing doesn't guarantee the UPDATE will succeed
- `.maybeSingle()` returns `null` when zero rows are updated instead of throwing
- The null check returned "Update returned no data" without revealing the actual issue

The pre-check was testing SELECT permissions, not UPDATE permissions, and the UPDATE was returning zero rows for a reason that was masked by `.maybeSingle()`.

## Fix Applied

**File: src/app/api/inventory/[id]/route.ts**

1. **Removed the pre-check** that was using `.maybeSingle()` with SELECT
2. **Changed the update query to use `.single()`** instead of `.maybeSingle()`
3. **Added specific error handling** for "Cannot coerce the result to a single JSON object"
4. **This error now returns 404** with message "Item not found or update not permitted"

```typescript
// Perform the update directly - if it fails, we'll get a clear error
const { data: item, error } = await supabase
  .from('inventory')
  .update(updateData)
  .eq('id', id)
  .select('*')
  .single();

if (error) {
  console.error('Inventory update error:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  console.error('Error details:', error.details);
  console.error('Error hint:', error.hint);
  
  // If the error is about coercing to single JSON object, it means zero rows were updated
  if (error.message.includes('Cannot coerce the result to a single JSON object')) {
    return NextResponse.json({ 
      error: 'Item not found or update not permitted',
      code: error.code,
    }, { status: 404 });
  }
  
  return NextResponse.json({ 
    error: `Update failed: ${error.message}`,
    code: error.code,
    details: error.details,
  }, { status: 500 });
}

console.log('Update successful for item:', id);
return NextResponse.json({ item });
```

## Why This Works

- `.single()` throws when zero rows are updated, which we now catch and handle
- No pre-check means we test the actual UPDATE operation, not just SELECT
- If UPDATE succeeds and returns a row, we know it worked definitively
- If UPDATE returns zero rows, `.single()` throws and we return a clear 404
- This is the standard Supabase pattern for update operations
- All authentication, RLS, and validation are preserved

## Files Changed

**Modified:**
- `src/app/api/inventory/[id]/route.ts` - Removed pre-check, use `.single()` with specific error handling

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

**Database Test:** Not performed - Production credentials or database access were not available.

**What Changed:**
- Removed the problematic pre-check that was testing SELECT instead of UPDATE
- Changed to the standard Supabase pattern using `.single()` for updates
- Added specific error handling for the zero-row case

**What Was Preserved:**
- All authentication checks
- All RLS policies
- All field validation
- All detailed logging
- Photo upload handling
- All update data field logic

## Git Status

**Commit Hash:** `0130adb`
**Commit Message:** "Fix inventory edit save error"
**Push Result:** Pushed to main branch

## Next Steps

**Required Before Marking Complete:**
1. **Verify Vercel Deployment** - Check dashboard for build status
2. **Test Edit Functionality in Production:**
   - Edit an existing inventory item
   - Check server logs for detailed error/success messages
   - Verify the edit saves successfully
   - Reload the page and verify changes persist
3. **Test Error Cases:**
   - Test with an invalid/nonexistent item ID
   - Verify it returns 404 with clear message
   - Verify RLS policies are still enforced

## Conclusion

**Root Cause:** Pre-check with `.maybeSingle()` tested SELECT permissions instead of UPDATE, and `.maybeSingle()` returned null for zero-row updates instead of throwing, masking the real issue.

**Fix:** Removed pre-check, changed to `.single()` for the update query, added specific error handling for zero-row case to return clear 404.

**Status:** ⏳ **FIX IMPLEMENTED AND PUSHED** - Awaiting production verification. The fix uses the standard Supabase pattern for updates. If the error persists in production, the server logs will show the exact error code, message, details, and hint for further diagnosis.
