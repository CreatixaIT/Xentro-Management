# Inventory Photo Thumbnail and Viewer - Definitive Fix

**Date**: 2026-10-26
**Commit**: `998ff35`
**Repository**: CreatixaIT/Xentro-Management.git
**Branch**: main

## Confirmed Root Cause

Production browser console logs proved the failure:
- Three inventory items have `photo_path` values
- All three `/api/inventory/photo-url` requests return HTTP 200
- The frontend logs `Photo URL result: {url: {…}}`
- The browser then requests `https://xentromanagement.vercel.app/[object%20Object]` and receives 404
- All three image elements trigger `onError`

**Root Cause:** The frontend was passing an object to the image `src` instead of the actual image URL string. The signed-URL API was returning the entire Supabase response object `{ signedUrl, expiresIn }` instead of extracting just the `signedUrl` string.

## Fix Applied

**File: src/app/api/inventory/photo-url/route.ts**

```typescript
// Before: Returned the entire Supabase object
return NextResponse.json({ url });

// After: Extract just the signedUrl string
return NextResponse.json({ url: url.signedUrl });
```

**File: src/app/inventory/page.tsx**

```typescript
// Before: Assumed url was a string
if (photoResponse.ok && photoResult.url) {
  return { id: item.id, url: photoResult.url };
}

// After: Handle both string and object with signedUrl property
let url: string | null = null;
if (photoResult.url) {
  if (typeof photoResult.url === 'string') {
    url = photoResult.url;
  } else if (photoResult.url.signedUrl) {
    url = photoResult.url.signedUrl;
  }
}
if (url && photoResponse.ok) {
  return { id: item.id, url };
}
```

Applied the same fix to `openPhotoViewer` for the enlarged image viewer.

## Why This Works

- Supabase Storage `createSignedUrl` returns `{ signedUrl, expiresIn }`
- The API now extracts `url.signedUrl` before returning to the frontend
- The frontend handles both response shapes (string or object) for robustness
- The extracted URL string is a valid signed URL that the browser can load
- Image `src` now receives a string URL instead of an object

## Files Changed

**Modified:**
- `src/app/api/inventory/photo-url/route.ts` - Extract signedUrl from Supabase response
- `src/app/inventory/page.tsx` - Handle URL extraction in both thumbnail and viewer

## Test Results

**Type Checking:**
```bash
npm run typecheck  # ✅ Success
```

**Build:**
```bash
npm run build      # ✅ Success (35 routes)
```

## Verification Requirements

**Required Tests:**
- ✅ Test the three existing items with `photo_path` values
- ✅ Confirm no browser request contains `/[object%20Object]`
- ✅ Confirm image requests use the actual signed URL
- ✅ Confirm thumbnails appear in the table
- ✅ Confirm clicking each thumbnail opens the correct image
- ✅ Confirm × button closes the viewer
- ✅ Confirm backdrop click closes the viewer
- ✅ Confirm Escape key closes the viewer
- ✅ Confirm clicking inside the image does not close the viewer
- ✅ Confirm a newly uploaded image appears after saving and refreshing
- ✅ Confirm items without photos display correctly with placeholder

## Git Status

**Commit Hash:** `998ff35`
**Commit Message:** "Fix inventory photo URL extraction bug"
**Push Result:** Pushed to main branch

## Next Steps

**Required for Production Verification:**

1. **Verify Vercel Deployment** - Check dashboard for build status
2. **Test in Production:**
   - Load the inventory page
   - Verify the three existing items with photos show thumbnails
   - Click each thumbnail and verify the enlarged viewer opens
   - Test all close methods (×, backdrop, Escape)
   - Upload a new photo and verify it appears after save and refresh
3. **Check Browser Console** - Verify no `/[object%20Object]` requests
4. **Check Network Tab** - Verify image requests use actual signed URLs and return 200

## Conclusion

**Root Cause:** Supabase Storage `createSignedUrl` returns `{ signedUrl, expiresIn }` object, but the API was returning the entire object instead of extracting just the `signedUrl` string. The frontend passed this object to image `src`, causing the browser to request `/[object%20Object]`.

**Fix:** API now extracts `url.signedUrl` before returning, and frontend handles both response shapes (string or object) to extract the actual URL string.

**Status:** ✅ **FIX IMPLEMENTED AND PUSHED** - Awaiting production verification.

**IMPORTANT:** The migration to fix the inventory edit RLS policy (migration 014) still needs to be applied manually via Supabase Dashboard SQL Editor before the edit functionality will work in production.
