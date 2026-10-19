# Xentro Management - Admin Approval and Bootstrap Runbook

## Overview

This document provides step-by-step instructions for manually approving employee accounts and creating initial admin users. Since Phase 1 does not include an admin dashboard, these operations must be performed directly in the Supabase database.

## Prerequisites

- Access to Supabase dashboard with your project
- Project URL and credentials configured
- Database migrations applied (`001_initial_schema.sql`, `002_storage_policies.sql`, `003_rate_limiter.sql`)
- Storage bucket `employee-photos` created

## Safety Checklist

Before running any SQL commands:

- [ ] Verify you are in the correct Supabase project
- [ ] Verify you are in the correct environment (Development vs Production)
- [ ] Have a backup of the database if possible
- [ ] Double-check user UUIDs before making changes
- [ ] Test operations on a test account first

## Finding User Information

### View All Pending Accounts

```sql
SELECT
  id,
  username,
  email,
  full_name,
  designation,
  status,
  role,
  created_at
FROM public.profiles
WHERE status = 'PENDING'
ORDER BY created_at DESC;
```

### Find User by Email

```sql
SELECT
  id,
  username,
  email,
  full_name,
  designation,
  status,
  role,
  created_at
FROM public.profiles
WHERE email = 'employee@example.com';
```

### Find User by Username

```sql
SELECT
  id,
  username,
  email,
  full_name,
  designation,
  status,
  role,
  created_at
FROM public.profiles
WHERE username_normalized = 'testuser';
```

### Find User by UUID

```sql
SELECT
  id,
  username,
  email,
  full_name,
  designation,
  status,
  role,
  created_at
FROM public.profiles
WHERE id = 'user-uuid-here';
```

## Account Approval

### Approve a Single Account by Email

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE email = 'employee@example.com';
```

### Approve a Single Account by UUID

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE id = 'user-uuid-here';
```

### Approve Multiple Accounts by Email List

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE email IN (
  'employee1@example.com',
  'employee2@example.com',
  'employee3@example.com'
);
```

### Approve All Pending Accounts (Use with Caution)

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE status = 'PENDING';
```

**⚠️ Warning**: Only approve accounts you have verified are legitimate.

## Account Suspension

### Suspend an Account by Email

```sql
UPDATE public.profiles
SET status = 'SUSPENDED'
WHERE email = 'employee@example.com';
```

### Suspend an Account by UUID

```sql
UPDATE public.profiles
SET status = 'SUSPENDED'
WHERE id = 'user-uuid-here';
```

### Reactivate a Suspended Account

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE email = 'employee@example.com';
```

## Role Management

### Promote User to Super Admin

**⚠️ Warning**: Super admins have full access. Only promote trusted users.

```sql
UPDATE public.profiles
SET role = 'SUPER_ADMIN', status = 'ACTIVE'
WHERE email = 'admin@example.com';
```

### Demote Super Admin to Employee

```sql
UPDATE public.profiles
SET role = 'EMPLOYEE'
WHERE email = 'former-admin@example.com';
```

### View All Super Admins

```sql
SELECT
  id,
  username,
  email,
  full_name,
  status,
  created_at
FROM public.profiles
WHERE role = 'SUPER_ADMIN';
```

## Creating the First Admin Account

### Option 1: Register via UI, Then Promote

1. Open the application at `http://localhost:3000` (or your deployment URL)
2. Click "Create Employee Account"
3. Fill in all fields with your admin information
4. Use a strong password (not a 6-digit passcode for admin accounts)
5. Submit the form
6. Check your email and click the verification link
7. Go to Supabase SQL Editor
8. Find your user by email:
   ```sql
   SELECT id, username, email FROM public.profiles WHERE email = 'your-email@example.com';
   ```
9. Promote to super admin:
   ```sql
   UPDATE public.profiles
   SET role = 'SUPER_ADMIN', status = 'ACTIVE'
   WHERE email = 'your-email@example.com';
   ```
10. Sign in with your username and password
11. Verify you can access the dashboard

### Option 2: Create Directly via SQL (Advanced)

**⚠️ Warning**: This bypasses email verification and requires manual Supabase Auth setup.

1. Generate a secure password hash (using Supabase Auth or your preferred method)
2. Create Supabase Auth user via dashboard or API
3. Create profile record:
   ```sql
   INSERT INTO public.profiles (
     id,
     username,
     username_normalized,
     email,
     full_name,
     age,
     address,
     nid_ciphertext,
     nid_iv,
     nid_auth_tag,
     blood_group,
     contact_number,
     emergency_contact_number,
     designation,
     avatar_path,
     role,
     status
   ) VALUES (
     'auth-user-uuid',
     'admin',
     'admin',
     'admin@example.com',
     'Admin Name',
     30,
     'Admin Address',
     'encrypted-nid-here',
     'iv-here',
     'auth-tag-here',
     'O+',
     '+8801234567890',
     '+8800987654321',
     'System Administrator',
     'placeholder-avatar-path',
     'SUPER_ADMIN',
     'ACTIVE'
   );
   ```

**Recommendation**: Use Option 1 for simplicity and security.

## Bulk Operations

### Approve All Employees Created This Week

```sql
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE status = 'PENDING'
  AND created_at >= NOW() - INTERVAL '7 days';
```

### Suspend Inactive Accounts (No Sign-in for 90 Days)

**Note**: This requires tracking last sign-in, which is not in Phase 1 schema. Add `last_sign_in_at` column in future phases.

### Export All Active Employees for Payroll

```sql
SELECT
  username,
  email,
  full_name,
  designation,
  contact_number,
  blood_group,
  created_at
FROM public.profiles
WHERE status = 'ACTIVE'
ORDER BY full_name;
```

## Verification

### Verify Account Status

After making changes, verify the account status:

```sql
SELECT
  id,
  username,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at
FROM public.profiles
WHERE email = 'employee@example.com';
```

### Verify Auth User Exists

```sql
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'employee@example.com';
```

### Verify Photo Storage

```sql
SELECT
  id,
  username,
  avatar_path
FROM public.profiles
WHERE email = 'employee@example.com';
```

Then check that the file exists in the `employee-photos` bucket in Supabase Storage.

## Troubleshooting

### User Cannot Sign In After Approval

1. Check account status:
   ```sql
   SELECT status, role FROM public.profiles WHERE email = 'user@example.com';
   ```
2. Verify email is confirmed:
   ```sql
   SELECT email_confirmed_at FROM auth.users WHERE email = 'user@example.com';
   ```
3. If not confirmed, manually confirm in Supabase Auth dashboard
4. Check for suspended status in profiles table

### Photo Upload Failed During Registration

1. Check if bucket exists: Go to Storage in Supabase dashboard
2. Verify bucket is named `employee-photos`
3. Check storage policies are applied (migration `002_storage_policies.sql`)
4. Manually upload photo via Supabase dashboard and update avatar_path:
   ```sql
   UPDATE public.profiles
   SET avatar_path = 'user-uuid/filename.jpg'
   WHERE email = 'user@example.com';
   ```

### NID Encryption Errors

1. Verify `NID_ENCRYPTION_KEY` is set in environment variables
2. Verify key is exactly 64 hex characters (32 bytes)
3. Check application logs for encryption errors
4. Regenerate key if corrupted (requires re-encrypting all NIDs)

### Rate Limiting Too Aggressive

1. Check current limits in migration `003_rate_limiter.sql`
2. Adjust limits in `src/lib/rate-limit.ts` function calls
3. Update migration with new limits
4. Restart application

## Audit Trail

### Log All Admin Actions

Create an audit log table (future enhancement):

```sql
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_email TEXT,
  old_status TEXT,
  new_status TEXT,
  old_role TEXT,
  new_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### View Recent Changes

After adding audit log table:

```sql
SELECT
  aal.created_at,
  p.username as admin_username,
  aal.action,
  aal.target_email,
  aal.old_status,
  aal.new_status,
  aal.old_role,
  aal.new_role
FROM public.admin_audit_log aal
JOIN public.profiles p ON aal.admin_id = p.id
ORDER BY aal.created_at DESC
LIMIT 50;
```

## Security Best Practices

1. **Never Promote Unverified Users**: Ensure email verification is complete before promotion
2. **Use Strong Passwords for Admins**: Require passwords, not 6-digit passcodes
3. **Limit Super Admin Count**: Only 2-3 super admins should exist
4. **Review Regularly**: Audit super admin list monthly
5. **Document Changes**: Keep a record of who was promoted and why
6. **Use Environment-Specific Admins**: Have separate admins for dev/staging/prod
7. **Revoke Access Promptly**: Immediately suspend departing employees
8. **Monitor for Anomalies**: Look for suspicious account creation patterns

## Emergency Procedures

### All Admins Locked Out

If all super admins lose access:

1. Go to Supabase Auth dashboard
2. Use "Magic Link" to send login email to trusted admin
3. Or temporarily disable password requirement in Auth settings
4. Create new super admin via SQL
5. Re-enable security settings

### Compromised Admin Account

1. Immediately suspend account:
   ```sql
   UPDATE public.profiles SET status = 'SUSPENDED' WHERE email = 'compromised@example.com';
   ```
2. Revoke Supabase Auth session in dashboard
3. Force password reset via Auth dashboard
4. Investigate what data was accessed
5. Notify security team

### Data Breach Response

1. Immediately suspend all pending registrations
2. Review recent account creations
3. Check for suspicious profile data
4. Rotate `NID_ENCRYPTION_KEY` (requires data migration)
5. Review and rotate `SUPABASE_SERVICE_ROLE_KEY`
6. Audit all admin actions
7. Notify affected users

## Contact

For issues with admin operations:
- Review Supabase documentation: https://supabase.com/docs
- Check application logs in Supabase dashboard
- Contact development team for code-level issues

---

**Last Updated**: 2026-10-20
**Version**: 1.0 (Phase 1)
