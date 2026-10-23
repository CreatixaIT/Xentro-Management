# Xentro Management - Deployment Guide

## Status: Ready for Vercel Deployment

**Latest Commit**: `20b388a`
**Repository**: https://github.com/CreatixaIT/Xentro-Management.git
**Branch**: main

## Automated Test Results

```bash
npm test            # ✅ 15/15 passed
npm run typecheck  # ✅ Success
npm run build      # ✅ Success (17 routes)
```

## Supabase Configuration Status

**Project**: qscmjtxmxnywivrowptm
**URL**: https://qscmjtxmxnywivrowptm.supabase.co

**Migrations Applied**: 5/5
- 001_initial_schema.sql ✅
- 002_storage.sql ✅
- 003_storage_policies.sql ✅
- 004_rate_limiter.sql ✅
- 005_security_fixes.sql ✅

**Security Verification**:
- ✅ RLS recursion fixed with SECURITY DEFINER helper
- ✅ Rate limiter restricted to service_role only
- ✅ Storage RLS enabled with 4 policies
- ✅ Users cannot change role/status
- ✅ NID encryption configured

## Vercel Deployment Steps

### Step 1: Configure Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

**Required Variables:**
```
NEXT_PUBLIC_APP_URL=https://xentromanagement.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://qscmjtxmxnywivrowptm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<from Supabase Dashboard>
SUPABASE_SECRET_KEY=<from Supabase Dashboard>
NID_ENCRYPTION_KEY=<from your local .env.local>
```

**Note**: These are the same values in your local `.env.local`. The encryption key is consistent with encrypted data.

### Step 2: Connect Vercel to GitHub (if not already)

1. Go to Vercel Dashboard
2. Click "Add New Project"
3. Import from GitHub: `CreatixaIT/Xentro-Management`
4. Select repository and `main` branch
5. Root Directory: `./` (repository root)
6. Build Command: `npm run build`
7. Output Directory: `.next`
8. Install Command: `npm install`

### Step 3: Configure Supabase Auth for Production

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://xentromanagement.vercel.app
```

**Redirect URLs (allowlist):**
```
http://localhost:3000/auth/callback
https://xentromanagement.vercel.app/auth/callback
```

In Supabase Dashboard → Authentication → Providers → Email:
- Enable Email provider
- Enable "Confirm email"
- Confirm email template: Set redirect to `https://xentromanagement.vercel.app/auth/callback`
- Reset password template: Set redirect to `https://xentromanagement.vercel.app/reset-password`

### Step 4: Configure Email Delivery

**For Testing:**
- Built-in Supabase email works (has limits)

**For Production:**
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Configure SMTP provider (SendGrid, Mailgun, etc.)
3. Verify sender email address
4. Test email delivery before going live

### Step 5: Deploy to Vercel

1. Push latest commit to GitHub (already done: 20b388a)
2. Vercel will auto-deploy from `main` branch
3. Monitor deployment logs for errors
4. Access: https://xentromanagement.vercel.app

## Post-Deployment Testing

### Test Email Confirmation Flow

1. Navigate to `https://xentromanagement.vercel.app/sign-up`
2. Register a new account with valid data
3. Check email for confirmation link
4. Click link to verify
5. Verify redirect to `/sign-in` with success message
6. Sign in with credentials

### Test Password Recovery Flow

1. Navigate to `https://xentromanagement.vercel.app/forgot-password`
2. Enter registered email
3. Check email for recovery link
4. Click link to access `/reset-password`
5. Reset password
6. Sign in with new password

### Test Protected Routes

1. Navigate to `https://xentromanagement.vercel.app/dashboard`
2. Verify redirect to `/sign-in` (unauthenticated)
3. Sign in with valid credentials
4. Verify access to dashboard (if ACTIVE status)
5. Verify redirect to `/pending-approval` (if PENDING status)

## Create First Admin Account

After successful registration and email verification:

1. Run this SQL in Supabase Dashboard SQL Editor:
```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN', status = 'ACTIVE'
WHERE email = 'your-admin-email@example.com';
```

2. Sign in as admin
3. Approve other accounts via SQL as needed (see ADMIN_BOOTSTRAP.md)

## Implementation Status

### ✅ Completed Features

- [x] Landing page with Xentro branding
- [x] Employee registration form (13 required fields)
- [x] Live username availability checking (debounced, database-backed)
- [x] Email verification flow via Supabase Auth PKCE
- [x] Username/password or 6-digit passcode sign-in
- [x] Server-side username-to-email lookup (email never exposed)
- [x] Forgot password flow with generic error messages
- [x] Password reset flow with token validation
- [x] Pending approval page for unapproved accounts
- [x] Protected dashboard placeholder
- [x] Sign-out functionality
- [x] Cookie-based sessions with Supabase SSR
- [x] NID encryption with AES-256-GCM
- [x] Private storage bucket for employee photos
- [x] RLS policies with recursion fix
- [x] PostgreSQL-backed rate limiting
- [x] Automated validation tests (15 tests)
- [x] Production build successful

### ⚠️ Manual Configuration Required

**Before Full Testing:**
1. Configure Vercel environment variables (see Step 1)
2. Configure Supabase Auth URL and redirect URLs (see Step 3)
3. Configure email delivery (see Step 4)

**After Deployment:**
4. Test email confirmation flow
5. Test password recovery flow
6. Create first admin account via SQL
7. Approve employee accounts as needed

### 🔒 Security Summary

- ✅ No secrets in committed files
- ✅ Service role key server-only
- ✅ RLS recursion eliminated
- ✅ Rate limiter restricted to service_role
- ✅ Users cannot change role/status
- ✅ Generic authentication errors
- ✅ NID encryption consistent
- ✅ Private storage bucket configured

## Remaining Work (Phase 2)

- [ ] Integration tests with test database
- [ ] Admin dashboard for account approval
- [ ] Additional authentication features as needed
- [ ] Attendance, tasks, projects modules (not Phase 1)

## Support

For issues:
- Check PRE_DEPLOYMENT_AUDIT.md for security audit details
- Check ADMIN_BOOTSTRAP.md for manual account operations
- Check TEST_PLAN.md for test procedures
- Review Supabase documentation for Auth and Storage issues
