# Xentro Management - Configuration Report

**Date**: 2026-10-20
**Project**: Xentro Management Phase 1
**Supabase Project**: qscmjtxmxnywivrowptm

## ✅ Completed Work

### 1. Dependency Installation
- ✅ Supabase SSR and Supabase JS already installed
- ✅ Installed @tailwindcss/postcss for Tailwind CSS v4 compatibility
- ✅ Installed Supabase Agent Skills (supabase, supabase-postgres-best-practices)

### 2. Security Fixes Applied
- ✅ Fixed deprecated `auth.role()` usage in RLS policies
  - Replaced with `TO authenticated` / `TO anon` clauses
  - Updated in 001_initial_schema.sql, 003_storage_policies.sql, 004_rate_limiter.sql
- ✅ Added `SECURITY DEFINER` with fixed `search_path = public` to privileged functions
  - update_updated_at_column() trigger function
  - check_rate_limit() function
- ✅ Fixed UPDATE policy to include WITH CHECK for role/status protection
- ✅ Added allowlist validation for auth callback redirect parameter

### 3. Database Migrations Applied
Successfully applied 4 migrations to remote database:

- **001_initial_schema**: ✅ Applied
  - Profiles table with encrypted NID fields
  - RLS policies using TO clauses
  - Unique constraints on username and email
  - Trigger for updated_at

- **002_storage**: ✅ Applied
  - Created `employee-photos` private storage bucket

- **003_storage_policies**: ✅ Applied
  - Storage policies for employee photos
  - Policies use TO authenticated/service_role/anon clauses
  - NOTE: RLS not enabled on storage.objects (requires owner permissions)

- **004_rate_limiter**: ✅ Applied
  - Rate limits table
  - check_rate_limit() function with SECURITY DEFINER
  - RLS policies denying anonymous/authenticated access

### 4. Supabase CLI Configuration
- ✅ Linked to project qscmjtxmxnywivrowptm
- ✅ Migration history synchronized

### 5. Environment Configuration
- ✅ Project URL configured: https://qscmjtxmxnywivrowptm.supabase.co
- ✅ NID encryption key generated: b4c4c6d8c07138ad3f0391149b82827a2a8f2a046a2b2b8bcca5a42fbed63942
- ✅ `.env.local` created (ignored by Git)

### 6. Build Verification
- ✅ TypeScript compilation: No errors
- ✅ Production build: Successful
- ✅ All 17 routes generated correctly

### 7. Code Changes Summary
- Modified: `src/app/auth/callback/route.ts` - Added redirect allowlist
- Modified: `supabase/migrations/001_initial_schema.sql` - Fixed RLS policies
- New: `supabase/migrations/002_storage.sql` - Storage bucket creation
- Renamed: `002_storage_policies.sql` → `003_storage_policies.sql`
- Renamed: `003_rate_limiter.sql` → `004_rate_limiter.sql`

## ⚠️ Remaining Required Actions

### 1. Supply Supabase Credentials
The application needs the following keys in `.env.local`:

**Required keys:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The `sb_publishable_` key from your project conversation
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API

**Current `.env.local` state:**
```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://qscmjtxmxnywivrowptm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SB_PUBLISHABLE_KEY_HERE  # ← Please provide
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE  # ← Please provide
NID_ENCRYPTION_KEY=b4c4c6d8c07138ad3f0391149b82827a2a8f2a046a2b2b8bcca5a42fbed63942
```

### 2. Enable RLS on Storage Objects (Manual Step)
Storage policies migration was applied but RLS was not enabled due to permission requirements.

**Action required:**
1. Go to Supabase Dashboard → SQL Editor
2. Run: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`
3. This enables the policies created in migration 003

### 3. Configure Supabase Auth Settings
**In Supabase Dashboard → Authentication → Providers:**
- Enable Email provider
- Enable "Confirm email"
- Set Site URL: `http://localhost:3000`
- Add Redirect URL: `http://localhost:3000/auth/callback`

**In Supabase Dashboard → Authentication → URL Configuration:**
- Site URL: `http://localhost:3000`
- Redirect URLs: Add `http://localhost:3000/auth/callback`

**In Supabase Dashboard → Authentication → Email Templates:**
- Confirm signup: Set redirect to `http://localhost:3000/auth/callback`
- Reset password: Set redirect to `http://localhost:3000/reset-password`

### 4. Email Delivery Configuration
For testing, the built-in Supabase email sender works but has strict limits.

**For production:**
- Configure SMTP provider (SendGrid, Mailgun, etc.) in Supabase Dashboard
- Update email templates with your branding
- Test email delivery before going live

### 5. Data API Permissions (If Needed)
If the profiles table is not accessible via API:
- Go to Supabase Dashboard → Integrations → Data API → Settings
- Ensure "Expose public schema" is enabled (if you need API access)
- This is separate from RLS - RLS controls row access, API settings control table access

## 📊 Application Status

### Routes Implemented
- ✅ `/` - Landing page
- ✅ `/sign-up` - Registration form
- ✅ `/sign-in` - Login form
- ✅ `/verify-email` - Email confirmation state
- ✅ `/forgot-password` - Password recovery
- ✅ `/reset-password` - Password reset
- ✅ `/pending-approval` - Account pending status
- ✅ `/dashboard` - Protected placeholder
- ✅ `/auth/callback` - Supabase PKCE callback
- ✅ `/auth/sign-out` - Sign-out route

### API Routes with Rate Limiting
- ✅ `/api/check-username` - 30/min
- ✅ `/api/sign-up` - 5 per 5 min
- ✅ `/api/sign-in` - 10/min
- ✅ `/api/forgot-password` - 3 per 5 min
- ✅ `/api/reset-password` - 5 per 5 min

### Security Features
- ✅ NID encryption with AES-256-GCM
- ✅ Private storage bucket created
- ✅ RLS policies using TO clauses (non-deprecated)
- ✅ SECURITY DEFINER functions with fixed search_path
- ✅ Service role key kept server-only
- ✅ Generic error messages (no enumeration)
- ✅ PostgreSQL-backed rate limiting
- ✅ Username-to-email lookup server-side only
- ✅ Session validation on protected routes
- ✅ Cookie-based sessions with Supabase SSR

## 🚀 Next Steps After Credentials

### 1. Add Credentials to .env.local
Edit `.env.local` and replace:
- `YOUR_SB_PUBLISHABLE_KEY_HERE` with your actual publishable key
- `YOUR_SERVICE_ROLE_KEY_HERE` with your actual service role key

### 2. Start Local Development
```bash
cd "/Users/air/Documents/Xentro Management"
npm run dev
```

### 3. Test the Application
- Open http://localhost:3000
- Test registration flow
- Test username availability
- Test sign-in with username/password
- Test password recovery
- Verify protected routes redirect unauthenticated users

### 4. Create First Admin Account
1. Register via UI
2. Verify email (check Supabase Auth logs)
3. Run SQL in Supabase Dashboard to approve and promote:
   ```sql
   UPDATE public.profiles
   SET role = 'SUPER_ADMIN', status = 'ACTIVE'
   WHERE email = 'your-admin-email@example.com';
   ```

### 5. Deploy to Vercel (When Ready)
- Follow README.md Vercel deployment section
- Add environment variables in Vercel dashboard
- Update Supabase redirect URLs for Vercel domain

## 📝 Files Changed

**Migrations:**
- `supabase/migrations/001_initial_schema.sql` - Fixed RLS policies
- `supabase/migrations/002_storage.sql` - New (bucket creation)
- `supabase/migrations/003_storage_policies.sql` - Renamed and fixed
- `supabase/migrations/004_rate_limiter.sql` - Renamed and fixed

**Application:**
- `src/app/auth/callback/route.ts` - Added redirect allowlist

**Git:**
- Committed all changes to main branch

## ❓ Questions

**Q: Can I test without the service role key?**
A: No. The signup flow requires service role to create the Auth user and profile. You'll need both keys.

**Q: Is the NID encryption key safe?**
A: Yes, it's a randomly generated 32-byte hex string. Keep it secret. If lost, you'll need to decrypt and re-encrypt all NIDs.

**Q: Why was RLS not enabled on storage.objects?**
A: The migration requires owner permissions on the storage schema. You can enable it manually in SQL Editor with one command.

**Q: Can I change the rate limits?**
A: Yes. Edit the limits in `src/lib/rate-limit.ts` function calls and optionally update the migration.

**Q: Are the Supabase client helpers correct?**
A: Yes. They follow the current @supabase/ssr pattern for Next.js 16 with proper cookie handling.

## 📞 Support

For issues:
- Check README.md for troubleshooting
- Check ADMIN_BOOTSTRAP.md for manual account operations
- Check TEST_PLAN.md for test procedures
- Review Supabase documentation for Auth and Storage issues

---

**Status**: Ready for credentials and manual RLS enablement
**Build**: Passing
**Migrations**: 4/4 applied (1 manual step remaining)
