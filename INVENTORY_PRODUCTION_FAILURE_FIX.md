# Inventory Production Failure - Diagnosis and Proper Fix

**Date**: 2026-10-25
**Commit**: `c13cc07`
**Repository**: CreatixaIT/Xentro-Management
**Branch**: main

## Phase 1: Actual Deployed State

**Current Commit**: `c13cc07`
**Previous Report Commit**: `78788e6`

**Files Inspected:**
- `src/app/api/inventory/[id]/route.ts` - PATCH handler
- `src/app/api/inventory/route.ts` - GET and POST handlers
- `src/app/api/inventory/photo-url/route.ts` - Signed URL generation
- `src/app/inventory/page.tsx` - Frontend inventory page

**Why Previous Fix Failed:**

The previous fix in commit `0c8cd71` attempted to fix the edit error by:
1. Changing `.select()` to `.select('*')`
2. Adding a null check after `.single()`

However, this did not work because:
- `.single()` throws the error "Cannot coerce the result to a single JSON object" **before** the null check can execute
- `.single()` throws immediately when the query returns zero rows OR multiple rows
- The null check only runs if `.single()` succeeds, which it doesn't when there are zero rows
- The root cause was the use of `.single()` itself, not the select clause

**Production Verification Status:**
- Vercel deployment status was not independently verified
- The changes were pushed to GitHub but production behavior was not tested
- Without production access, I cannot verify whether the deployed code matches the current commit
- I cannot claim production verification based on local build success

## Phase 2: Fix Edit/Save

### Root Cause

The error "Cannot coerce the result to a single JSON object" occurs in the `PATCH /api/inventory/[id]` route because:

1. `.update().select().single()` is used to update and return the updated row
2. `.single()` throws immediately when the query returns zero rows (item doesn't exist or RLS blocks it)
3. The null check at line 90-92 only runs if `.single()` succeeds
4. Therefore, the error is thrown before the null check can handle the zero-row case

This can happen when:
- The item ID doesn't exist in the database
- RLS policy prevents the authenticated user from updating the item
- The item was deleted between opening the edit modal and clicking save
- A trigger or constraint causes the update to affect zero rows

### Fix Applied

**File: src/app/api/inventory/[id]/route.ts**

1. **Added pre-check to verify item exists before update**:
   ```typescript
   const { data: existingItem, error: checkError } = await supabase
     .from('inventory')
     .select('id')
     .eq('id', id)
     .maybeSingle();

   if (checkError) {
     console.error('Inventory check error:', checkError);
     return NextResponse.json({ error: checkError.message }, { status: 500 });
   }

   if (!existingItem) {
     return NextResponse.json({ error: 'Item not found' }, { status: 404 });
   }
   ```

2. **Changed update query to use `.maybeSingle()` instead of `.single()`**:
   ```typescript
   const { data: item, error } = await supabase
     .from('inventory')
     .update(updateData)
     .eq('id', id)
     .select('*')
     .maybeSingle();
   ```

3. **Added explicit check for null after update**:
   ```typescript
   if (!item) {
     return NextResponse.json({ error: 'Update failed' }, { status: 500 });
   }
   ```

### Why This Works

- `.maybeSingle()` returns `null` instead of throwing when there are zero rows
- The pre-check verifies the item exists before attempting the update
- If the item doesn't exist, we return 404 immediately without attempting the update
- If the update succeeds but returns zero rows (shouldn't happen after pre-check), we catch it with the null check
- This allows the update to complete successfully and return the updated row
- All authentication, RLS, and validation protections are preserved

## Phase 3: Fix Photo Upload and Display

### Root Cause

Photo thumbnails were not appearing after upload due to multiple issues:

1. **No error handling in photo URL fetching**: If the signed URL API failed, the promise would reject and the entire photo URL mapping would fail
2. **Form state missing photo_path**: When editing an item, the existing photo_path was not preserved in the form state
3. **Edit modal didn't show current photo**: Users couldn't see the existing photo when editing
4. **photo_path not sent in PATCH requests**: Edits would lose the photo reference

### Fix Applied

**File: src/app/inventory/page.tsx**

1. **Added photo_path to form state**:
   ```typescript
   const [formData, setFormData] = useState({
     ...
     photo_data: '',
     photo_path: '',
   });
   ```

2. **Added error handling to photo URL fetching**:
   ```typescript
   const photoPromises = result.inventory
     .filter((item: InventoryItem) => item.photo_path)
     .map(async (item: InventoryItem) => {
       try {
         const photoResponse = await fetch(`/api/inventory/photo-url?path=${encodeURIComponent(item.photo_path!)}`);
         const photoResult = await photoResponse.json();
         if (photoResponse.ok && photoResult.url) {
           return { id: item.id, url: photoResult.url };
         }
         return null;
       } catch (error) {
         console.error('Failed to fetch photo URL:', error);
         return null;
       }
     });
   ```

3. **Added photo_path to handleEdit**:
   ```typescript
   const handleEdit = (item: InventoryItem) => {
     setEditingItem(item);
     setFormData({
       ...
       photo_data: '',
       photo_path: item.photo_path || '',
     });
     setShowAddModal(true);
   };
   ```

4. **Added photo_path to itemData for PATCH requests**:
   ```typescript
   const itemData = {
     ...
     photo_data: formData.photo_data || null,
     photo_path: formData.photo_path || null,
   };
   ```

5. **Added photo_path to resetForm**:
   ```typescript
   const resetForm = () => {
     setFormData({
       ...
       photo_data: '',
       photo_path: '',
     });
     setEditingItem(null);
   };
   ```

6. **Display current photo in edit modal**:
   ```typescript
   {editingItem && editingItem.photo_path && !formData.photo_data && (
     <div className="mt-2">
       <span className="text-sm text-gray-600">Current photo: </span>
       <img 
         src={photoUrls[editingItem.id] || ''} 
         alt="Current" 
         className="mt-1 w-32 h-32 object-cover rounded-lg"
         onError={(e) => {
           (e.target as HTMLImageElement).style.display = 'none';
         }}
       />
     </div>
   )}
   ```

### Why This Works

- Photo URL fetching now handles errors gracefully without breaking the entire list load
- photo_path is preserved when editing, so existing photos aren't lost
- Users can see the current photo when editing an item
- Photo path is sent in PATCH requests to maintain the reference
- Photo URLs are cached and fetched with proper error handling
- Failed photo URL fetches don't prevent the inventory list from loading

## Phase 4: Column Selection and PDF

The column selection and PDF implementations from previous commits are preserved:

- Photo column appears first in DEFAULT_COLUMNS
- Photo can be toggled in column selector
- PDF respects selected columns
- Photo column shows "Yes" or "—" in PDF

These features were working correctly in the previous implementation and are preserved in this fix.

## Files Changed

**Modified:**
- `src/app/api/inventory/[id]/route.ts` - Fixed edit error with pre-check and maybeSingle
- `src/app/inventory/page.tsx` - Fixed photo display with error handling and photo_path preservation

## Test Results

**Type Checking:**
```bash
npm run typecheck  # ✅ Success
```

**Build:**
```bash
npm run build      # ✅ Success (35 routes)
```

## Required Workflows (Not Yet Verified in Production)

**Edit Functionality:**
- ⏳ Edit an existing inventory item's name and save
- ⏳ Reload the page and verify the edited value persists
- ⏳ Edit other supported fields (quantity, price, etc.)
- ⏳ Test a nonexistent item ID (should return 404)
- ⏳ Test an unauthorized update (should return 401)

**Photo Functionality:**
- ⏳ Create a test inventory item with a photo
- ⏳ Verify the storage object exists in Supabase
- ⏳ Verify the inventory row contains the correct photo path
- ⏳ Verify the thumbnail appears after saving
- ⏳ Reload the page and verify the thumbnail persists
- ⏳ Click a thumbnail to open the enlarged viewer
- ⏳ Test closing with × button
- ⏳ Test closing by clicking backdrop
- ⏳ Test closing with Escape key
- ⏳ Edit an item with a photo and verify the photo is preserved

**Column Selection and PDF:**
- ⏳ Toggle Photo column in column selector
- ⏳ Verify it appears/disappears from table
- ⏳ Generate PDF with different selected columns
- ⏳ Verify PDF uses exactly the selected columns

**Regression Tests:**
- ⏳ Create an item without a photo
- ⏳ Verify it appears in the inventory list
- ⏳ Test filters, categories, search, sorting
- ⏳ Test delete
- ⏳ Verify permissions and RLS remain enforced

## Regression Checks (Based on Code Review)

Based on code inspection, the following should still work:
- ✅ New item save still works (no changes to POST handler)
- ✅ Edit item now works (fixed with pre-check and maybeSingle)
- ✅ Delete item still works (no changes to DELETE handler)
- ✅ Category creation still works (no changes to category API)
- ✅ All filters still work (no changes to filter logic)
- ✅ Sorting still works (no changes to sort logic)
- ✅ Column selection still works (no changes to column selector)
- ✅ PDF generation still works (no changes to PDF logic)
- ✅ PDF column selection still works (no changes to PDF column logic)
- ✅ Unauthorized users still blocked (no changes to auth checks)
- ✅ RLS policies still enforced (no changes to RLS)
- ✅ Private storage remains private (no changes to storage policies)

## Git Status

**Commit Hash:** `c13cc07`
**Commit Message:** "Fix inventory edit and photo display - proper root cause fix"
**Push Result:** Pushed to main branch

## Next Steps

**Required Before Marking Complete:**
1. **Verify Vercel Deployment** - Check dashboard for build status
2. **Test Edit Functionality in Production:**
   - Edit an existing inventory item
   - Verify the edit saves successfully
   - Reload the page and verify changes persist
   - Check browser console for any errors
3. **Test Photo Upload in Production:**
   - Create a new item with a photo
   - Verify thumbnail appears in the table
   - Reload and verify it persists
4. **Test Photo Viewer in Production:**
   - Click thumbnail to open viewer
   - Test all close methods
5. **Test Column Selection and PDF in Production:**
   - Toggle Photo column
   - Generate PDF with different selections
6. **Test Regression Cases in Production:**
   - Create item without photo
   - Test all filters and sorting
   - Test delete

## Conclusion

**PART A Root Cause:** `.update().select().single()` throws "Cannot coerce the result to a single JSON object" **before** the null check can execute when the update matches zero rows. The `.single()` method throws immediately for zero or multiple rows.

**PART A Fix:** Added pre-check using `.maybeSingle()` to verify item exists before update, changed update query to use `.maybeSingle()` instead of `.single()`, added explicit null check after update.

**PART B Root Cause:** Photo URL fetching had no error handling causing silent failures, form state didn't include photo_path so edits lost photo reference, edit modal didn't show current photo.

**PART B Fix:** Added try-catch error handling to photo URL fetching, added photo_path to form state and all relevant handlers, display current photo in edit modal, preserve photo_path on edit.

**Status:** ⏳ **FIXES IMPLEMENTED AND PUSHED** - Awaiting production verification. Do not mark complete until editing persists after reload and newly uploaded photos appear in the inventory table in the deployed application.
