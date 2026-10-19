# Xentro Management - Phase 1

Employee registration and authentication system with Supabase backend and Next.js frontend.

## Features

- **Landing Page**: Branded sign-up and sign-in entry points
- **Employee Registration**: Complete form with validation, live username availability, photo upload
- **Email Verification**: Supabase Auth email confirmation flow
- **Sign-In**: Username/password or 6-digit passcode authentication
- **Password Recovery**: Forgot password and reset flows
- **Account Approval**: Pending approval status for new employees
- **Security**: NID encryption, private photo storage, rate limiting, RLS policies
- **Responsive Design**: Mobile-friendly branded UI with Xentro karting poster

## Requirements

- Node.js 18+ and npm
- Supabase account (free tier works)
- (Optional) Supabase CLI for local development
- (Optional) Vercel CLI for deployment

## Installation

1. Clone the repository:
```bash
cd "/Users/air/Documents/Xentro Management"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

## Environment Variables

Edit `.env.local` and fill in the following values:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NID_ENCRYPTION_KEY=your-32-byte-hex-key
```

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Navigate to **Settings > API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Generating NID Encryption Key

Run this command to generate a secure 32-byte hex key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `NID_ENCRYPTION_KEY` in `.env.local`.

## Database Setup

### Option 1: Using Supabase CLI (Recommended for Development)

1. Link your project:
```bash
supabase link --project-ref your-project-id
```

2. Apply migrations:
```bash
supabase db push
```

3. Create the private storage bucket:
```bash
supabase storage new employee-photos
```

### Option 2: Using Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Run the SQL from `supabase/migrations/001_initial_schema.sql`
3. Run the SQL from `supabase/migrations/002_storage_policies.sql`
4. Run the SQL from `supabase/migrations/003_rate_limiter.sql`
5. Go to **Storage** and create a new bucket named `employee-photos`
6. Make the bucket **private** (not public)

## Supabase Auth Configuration

1. Go to **Authentication > Providers** in Supabase dashboard
2. Enable **Email** provider
3. Under **Email** provider settings:
   - **Confirm email**: Enable
   - **Secure email change**: Enable
4. Go to **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for local)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
5. Go to **Authentication > Email Templates**:
   - **Confirm signup**: Set redirect URL to `http://localhost:3000/auth/callback`
   - **Reset password**: Set redirect URL to `http://localhost:3000/reset-password`

## Running the Application

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Email Configuration

The built-in Supabase email sender is for testing only and has strict limits. For production:

1. Go to **Authentication > Email Templates** in Supabase dashboard
2. Configure an SMTP provider (SendGrid, Mailgun, etc.)
3. Update email templates with your branding

## Vercel Deployment

### Setup

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### Environment Variables

In Vercel dashboard, add these environment variables for your Preview and Production environments:

- `NEXT_PUBLIC_APP_URL`: Your Vercel domain (e.g., `https://your-app.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NID_ENCRYPTION_KEY`: Your 32-byte hex encryption key

### Update Supabase Redirect URLs

After deploying to Vercel, update your Supabase project:

1. Go to **Authentication > URL Configuration**
2. Add your Vercel domains to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
3. Update email template redirect URLs to use your Vercel domain

## Admin Approval / Bootstrap

New employee accounts start with `status = 'PENDING'` and `role = 'EMPLOYEE'`. An administrator must manually approve them.

### Manual Approval via SQL

Run this in Supabase SQL Editor (replace with actual user UUID or email):

```sql
-- Approve a user by email
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE email = 'employee@example.com';

-- Or approve by user UUID
UPDATE public.profiles
SET status = 'ACTIVE'
WHERE id = 'user-uuid-here';

-- Promote to super admin (use with caution)
UPDATE public.profiles
SET role = 'SUPER_ADMIN', status = 'ACTIVE'
WHERE email = 'admin@example.com';
```

### Finding User UUID

```sql
SELECT id, username, email, status, role
FROM public.profiles
WHERE email = 'employee@example.com';
```

## Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── auth/           # Auth callback routes
│   │   ├── dashboard/      # Protected dashboard
│   │   ├── sign-up/        # Registration page
│   │   ├── sign-in/        # Login page
│   │   └── ...
│   ├── components/         # Reusable components
│   ├── lib/               # Utilities and clients
│   │   ├── supabase/      # Supabase client configs
│   │   ├── encryption.ts  # NID encryption
│   │   ├── validation.ts  # Zod schemas
│   │   ├── rate-limit.ts  # Rate limiting
│   │   └── env.ts         # Environment validation
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # Database migrations
├── public/               # Static assets (poster, logo)
└── .env.example          # Environment template
```

## Troubleshooting

### Build Errors

- **Tailwind CSS v4 errors**: Ensure you have `@tailwindcss/postcss` installed
- **TypeScript errors**: Run `npm run typecheck` to see specific issues
- **Module not found**: Run `npm install` to ensure dependencies are installed

### Email Verification Not Working

- Check Supabase Auth email confirmation is enabled
- Verify redirect URLs match your `NEXT_PUBLIC_APP_URL`
- Check spam folder for test emails
- Review Supabase logs for delivery errors

### Username Availability Not Working

- Ensure database migrations are applied
- Check `profiles` table and `username_normalized` index exists
- Verify service role key is correct

### Photo Upload Failing

- Ensure `employee-photos` bucket exists in Supabase Storage
- Check bucket is private (not public)
- Verify storage policies are applied
- Check file size (max 2MB) and type (JPEG/PNG/WebP)

### Rate Limiting Too Strict

- Adjust limits in `src/lib/rate-limit.ts` and migration `003_rate_limiter.sql`
- Current limits:
  - Username check: 30/min
  - Sign-up: 5 per 5 min
  - Sign-in: 10/min
  - Forgot password: 3 per 5 min
  - Reset password: 5 per 5 min

## Security Notes

- **NID Encryption**: NID numbers are encrypted with AES-256-GCM before storage. Never store or log plaintext NIDs.
- **Service Role Key**: Never commit `SUPABASE_SERVICE_ROLE_KEY` to Git. It should only be used server-side.
- **Private Storage**: Employee photos are in a private bucket. Signed URLs are required for access.
- **Rate Limiting**: PostgreSQL-backed rate limiting prevents abuse across serverless invocations.
- **RLS Policies**: Row Level Security ensures users can only access their own data.
- **Username Lookup**: Email is never exposed to the client. Server-side lookup converts username to email for authentication.

## Phase 1 Scope

This implementation includes:
- ✅ Landing page with branding
- ✅ Employee registration with validation
- ✅ Live username availability checking
- ✅ Email verification flow
- ✅ Username/password or passcode sign-in
- ✅ Forgot password and reset flows
- ✅ Pending approval page
- ✅ Dashboard placeholder
- ✅ NID encryption
- ✅ Private photo storage
- ✅ Rate limiting
- ✅ Database migrations and RLS policies

**Out of scope for Phase 1:**
- Attendance tracking
- Task management
- Projects
- Inventory
- Payroll
- Notifications
- Full admin dashboard
- Public admin privilege escalation

## License

ISC

## Support

For issues or questions, please contact the project administrator.
