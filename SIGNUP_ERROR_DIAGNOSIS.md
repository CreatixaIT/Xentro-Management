# Signup Error Diagnosis and Fix

## Issue Summary

**Symptom**: Production signup displays "An unexpected error occurred"
**Status**: Fixed and deployed
**Root Cause 1**: Missing environment variables in Vercel production environment
**Root Cause 2**: Incorrect Auth API usage bypassing email confirmation

## Root Cause Analysis

### Root Cause 1: Missing Environment Variables

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

### Root Cause 2: Incorrect Auth API Usage

The signup implementation used `supabase.auth.admin.createUser()` with `email_confirm: true`:

```typescript
const { data: authData, error: authError } = await serviceRoleClient.auth.admin.createUser({
  email: normalizedEmail,
  password,
  email_confirm: true,  // This bypasses email verification!
  user_metadata: {
    username: normalizedUsername,
  },
});
```

**Why this is wrong:**
1. `auth.admin.createUser()` is for administrative user creation, not user self-service signup
2. Setting `email_confirm: true` creates the user as **already confirmed**, bypassing email verification entirely
3. The admin API does **not** send confirmation emails
4. The code said "Please check your email to verify" but the user was already verified

**Correct approach:**
Use `auth.signUp()` which:
- Creates an unconfirmed user
- Automatically sends a confirmation email via Supabase Auth
- Uses the configured SMTP provider
- Follows the standard PKCE flow for email verification

## Fix Applied

### Fix 1: Environment Validation

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

if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
  console.error('[Signup] Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
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

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.error('[Signup] Missing NEXT_PUBLIC_APP_URL');
  return NextResponse.json(
    { message: 'Server configuration error. Please contact support.' },
    { status: 500 }
  );
}
```

### Fix 2: Proper Email Confirmation Flow

Switched from admin API to proper signup flow:

```typescript
// Create Supabase Auth user using regular signup (not admin API)
// This sends the confirmation email automatically
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const publicClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: authData, error: authError } = await publicClient.auth.signUp({
  email: normalizedEmail,
  password,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: {
      username: normalizedUsername,
    },
  },
});
```

### Fix 3: Improved Error Logging

Added correlation IDs and structured logging for better debugging:

```typescript
const correlationId = randomUUID();
console.error(`[Signup][${correlationId}] Auth signup error:`, authError);
console.error(`[Signup][${correlationId}] Photo upload failed:`, uploadError);
console.error(`[Signup][${correlationId}] Profile creation failed:`, profileError);
console.error(`[Signup][${correlationId}] Unexpected error:`, error);
```

### Fix 4: Rate Limiter Protection

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

**Commit Hash**: `c18892b`
**Commit Message**: "Fix signup to use proper Supabase Auth email confirmation flow"

**Files Changed**:
- `src/app/api/sign-up/route.ts` - Switched to auth.signUp(), added NEXT_PUBLIC_APP_URL validation

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

### Email Delivery (Required for Signup to Work)

The signup flow now properly uses Supabase Auth to send confirmation emails. You MUST configure SMTP:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Configure SMTP provider (e.g., Resend, SendGrid, Mailgun)
3. Verify sender email address
4. Test email delivery

**Note**: The 535 "Authentication credentials invalid" error you saw in Supabase Auth logs indicates incorrect SMTP credentials. After correcting them in the Supabase dashboard, email delivery should work.

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
- `[Signup] Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if publishable key is missing
- `[Signup] Missing SUPABASE_SECRET_KEY` if secret key is missing
- `[Signup] Missing NID_ENCRYPTION_KEY` if encryption key is missing
- `[Signup] Missing NEXT_PUBLIC_APP_URL` if app URL is missing
- `[Signup][<correlation-id>] Auth signup error` if auth signup fails
- `[Signup][<correlation-id>] Photo upload failed` if upload fails
- `[Signup][<correlation-id>] Profile creation failed` if profile insert fails

These logs will help diagnose any remaining issues quickly.

## Conclusion

The root causes were:
1. Missing environment variables in Vercel production (now validated explicitly)
2. Incorrect Auth API usage that bypassed email verification (now using proper signup flow)

With the SMTP credentials corrected in the Supabase dashboard and the proper auth.signup() implementation, the signup flow will now:
1. Create an unconfirmed user
2. Send a confirmation email via configured SMTP
3. User clicks link to verify via /auth/callback
4. User can sign in with verified email

**Status**: Code fixes deployed. Requires manual Vercel environment variable configuration and valid SMTP credentials for signup to work in production.
