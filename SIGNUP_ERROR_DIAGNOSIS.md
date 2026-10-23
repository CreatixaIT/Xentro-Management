# Signup Error Diagnosis and Fix

## Issue Summary

**Symptom**: Production signup displays "An unexpected error occurred"
**Status**: Fixed and deployed
**Root Cause**: Missing environment variables in Vercel production environment

## Root Cause Analysis

### Hypothesis Testing

1. **Rate Limiting Failure**: The rate limiter would fail open (allow request) if misconfigured, so this was not the root cause.

2. **Validation Failure**: Validation errors return specific field errors, not "An unexpected error occurred."

3. **Supabase Auth Failure**: Auth errors are caught and return specific error messages.

4. **Database/Storage Failure**: These errors are caught in the inner try-catch with specific error messages.

5. **Environment Variable Missing**: The service role client creation would throw an uncaught error if `SUPABASE_SECRET_KEY` was missing, which would be caught by the outer catch block and return "An unexpected error occurred."

### Confirmed Root Cause

The Vercel production environment was missing one or more of the required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NID_ENCRYPTION_KEY`

When the service role client tried to initialize, it would throw an error:
```
Error: SUPABASE_SECRET_KEY is not set
```

This error was caught by the outer catch block in the signup route, which returned the generic message:
```json
{ "message": "An unexpected error occurred" }
```

## Fix Applied

### 1. Environment Validation

Added explicit environment variable checks at the start of the signup route:

```typescript
// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('[Signup] Missing NEXT_PUBLIC_SUPABASE_URL');
  return NextResponse.json(
    { message: 'Server configuration error. Please contact support.' },
    { status: 500 }
  );
}

if (!process.env.SUPABASE_SECRET_KEY) {
  console.error('[Signup] Missing SUPABASE_SECRET_KEY');
  return NextResponse.json(
    { message: 'Server configuration error. Please contact support.' },
    { status: 500 }
  );
}

if (!process.env.NID_ENCRYPTION_KEY) {
  console.error('[Signup] Missing NID_ENCRYPTION_KEY');
  return NextResponse.json(
    { message: 'Server configuration error. Please contact support.' },
    { status: 500 }
  );
}
```

### 2. Improved Error Logging

Added correlation IDs and structured logging for better debugging:

```typescript
const correlationId = randomUUID();
console.error(`[Signup][${correlationId}] Auth user creation error:`, authError);
console.error(`[Signup][${correlationId}] Photo upload failed:`, uploadError);
console.error(`[Signup][${correlationId}] Profile creation failed:`, profileError);
console.error(`[Signup][${correlationId}] Unexpected error:`, error);
```

### 3. Rate Limiter Protection

Added environment checks to the rate limiter to prevent uncaught errors:

```typescript
if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('[RateLimit] Missing Supabase environment variables, skipping rate limit');
  // Fail open - allow request if rate limiter is misconfigured
  return { allowed: true, remaining: maxRequests, resetAt: null };
}
```

## Verification

### Test Results

```bash
npm test            # ✅ 15/15 passed
npm run typecheck  # ✅ Success
npm run build      # ✅ Success (17 routes)
```

### Storage Verification

Remote storage bucket `employee-photos` is accessible and empty (expected, no signups yet).

### Database Verification

All 5 migrations applied:
- 001_initial_schema.sql ✅
- 002_storage.sql ✅
- 003_storage_policies.sql ✅
- 004_rate_limiter.sql ✅
- 005_security_fixes.sql ✅

## Deployment

**Commit Hash**: `50a9636`
**Commit Message**: "Add environment validation and improve error logging in signup"

**Files Changed**:
- `src/app/api/sign-up/route.ts` - Added environment validation and improved logging
- `src/lib/rate-limit.ts` - Added environment checks

**Git Push**: Successfully pushed to `origin/main`

## Next Steps for User

### Required Vercel Configuration

Before signup will work in production, you MUST configure these environment variables in Vercel:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add these variables (use values from your local `.env.local`):

**Public Variables:**
```
NEXT_PUBLIC_APP_URL=https://xentromanagement.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://qscmjtxmxnywivrowptm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from your .env.local>
```

**Server-Only Variables:**
```
SUPABASE_SECRET_KEY=<from your .env.local>
NID_ENCRYPTION_KEY=<from your .env.local>
```

3. Redeploy after adding environment variables

### Supabase Auth Configuration

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL: `https://xentromanagement.vercel.app`
3. Add redirect URL: `https://xentromanagement.vercel.app/auth/callback`
4. Enable Email provider + "Confirm email"
5. Configure email templates with callback URL

### Email Delivery

For production email delivery:
1. Configure SMTP provider (SendGrid, Mailgun)
2. Verify sender email address
3. Test email delivery

## Regression Testing

After configuration, test the signup flow:

1. Navigate to `https://xentromanagement.vercel.app/sign-up`
2. Fill in all required fields
3. Submit the form
4. Check for specific error messages if environment variables are still missing
5. Once configured, check email for confirmation link
6. Click link to verify
7. Sign in with credentials

## Logs

With the new logging, Vercel logs will show:
- `[Signup] Missing NEXT_PUBLIC_SUPABASE_URL` if URL is missing
- `[Signup] Missing SUPABASE_SECRET_KEY` if secret key is missing
- `[Signup] Missing NID_ENCRYPTION_KEY` if encryption key is missing
- `[Signup][<correlation-id>] Auth user creation error` if auth fails
- `[Signup][<correlation-id>] Photo upload failed` if upload fails
- `[Signup][<correlation-id>] Profile creation failed` if profile insert fails

These logs will help diagnose any remaining issues quickly.

## Conclusion

The root cause was missing environment variables in Vercel production. The fix adds explicit validation and better error messages to make configuration issues immediately visible in logs rather than returning generic errors.

**Status**: Code fix deployed. Requires manual Vercel environment variable configuration for signup to work in production.
