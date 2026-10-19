# Xentro Management — Devin Master Implementation Instructions

**Phase:** 1 — Branding, employee registration, email verification, sign-in, and password recovery  
**Local project directory:** `/Users/air/Documents/Xentro Management`  
**Product owner:** User (human approval is required for external/production changes)  
**Execution role:** Devin is the implementing engineer. Follow the specification below; do not stop after writing a plan or a visual mockup.

---

## 0. Mission and boundaries

Build a working, testable Phase 1 of **Xentro Management** as a new application. It is separate from any pre-existing Xentro PMS project. The goal is a complete authentication experience connected to Supabase, deployable to Vercel, with branded responsive UI and security appropriate for employee personal information.

Work only inside `/Users/air/Documents/Xentro Management`. Start by checking `pwd`, listing the directory (including hidden files), checking Git status, and inspecting existing content. If the directory already contains work, preserve it and understand it before editing. Do not overwrite or delete user work to make a clean scaffold. Never enter or alter another Xentro project directory.

The starter pack contains the two user-supplied image assets in `assets/source/`:
- `xentro-karting-poster.png` — background poster
- `xentro-logo.png` — logo

Copy the assets into the application's public assets location as part of implementation, keeping the originals in `assets/source/`. Do not replace them with stock images or re-create the logo. If this starter pack was not extracted into the project and the supplied assets are not available elsewhere, do not silently substitute imagery; report exactly which asset is missing and ask the user to copy it in.

**Strict Phase 1 scope:**
1. Landing page and Xentro branding.
2. Employee signup form and database-backed username availability.
3. Email verification and callback handling.
4. Username + password/passcode sign-in.
5. Forgot-password and password-reset flows.
6. Session handling, pending-account handling, database security, private photo storage, tests, and setup/deployment documentation.

Do **not** build attendance, tasks, projects, inventory, payroll, notifications, dashboards beyond a minimal post-login/pending state, or unrelated modules. Do not add paid services or make production changes without explicit user approval.

## 1. Engineering workflow — mandatory

Use this implementation sequence and keep a concise progress checklist in `IMPLEMENTATION_LOG.md`:

1. **Inspect and report:** check Node/npm versions, available files, Git state, and whether Supabase/Vercel CLIs are available. Do not print `.env.local`, tokens, keys, or secrets in terminal summaries. Identify prerequisites that are genuinely missing.
2. **Foundation:** establish the Next.js app, TypeScript, styling, linting, formatting conventions, environment validation, and Git ignore rules. Use stable compatible releases, not canary/nightly packages. Use npm unless the existing project has a valid lockfile and established package manager.
3. **Design system:** integrate the supplied background and logo; implement all authentication screens responsively.
4. **Database/security:** write version-controlled Supabase migrations and storage policies before connecting forms to production data.
5. **Authentication flows:** build and test signup, verification callback, login, recovery, and reset, including race/error cases.
6. **Automated verification:** run available unit/integration/browser tests, lint, typecheck, and production build. Fix failures; do not claim a command passed unless it actually passed.
7. **Manual verification:** document exact dashboard settings and test emails needed to finish real-provider tests. Use a local Supabase stack and local email viewer if available; otherwise test all non-secret-dependent code locally and clearly mark what is blocked by missing credentials/configuration.
8. **Release preparation:** create a clean README, environment example, migration/deployment instructions, admin-approval runbook, and final test report. Use a Vercel Preview deployment only if the user has connected/authorized the integration. Do not promote production or run destructive remote migrations without explicit approval.

After each stage, update `IMPLEMENTATION_LOG.md` with: completed work, commands run, passed/failed results, and next blocker. Do not ask the user to do steps Devin can safely perform locally. When a human action or secret is genuinely required, ask for only that item and provide exact dashboard navigation/instructions. Never invent Supabase project IDs, credentials, SMTP credentials, or Vercel URLs.

## 2. Preferred stack and implementation standards

- Latest stable Next.js with App Router, React, TypeScript `strict: true`, and Tailwind CSS or an equally consistent project-wide styling approach.
- Supabase hosted PostgreSQL and Supabase Auth for email/password authentication.
- Use the currently recommended Supabase SSR integration (`@supabase/ssr`) for cookie-based sessions and the PKCE authentication flow, following the official documentation for the actual installed versions. Confirm APIs against current official docs rather than using stale code samples.
- Supabase Storage for employee photos in a **private** bucket.
- Zod (or equivalent maintained schema validator) for server-side input validation; client-side validation is for user experience only and is never a security boundary.
- Use the framework's currently supported route/session refresh conventions. Do not copy obsolete middleware/proxy patterns without checking the installed Next.js version documentation.
- Add automated tests suited to the app (unit tests for validation/normalization/security helpers; integration tests for routes/database where feasible; Playwright or an equivalent browser test for important journeys if supported).
- Use semantic HTML, accessible labels, keyboard-operable controls, visible focus states, appropriate contrast, useful inline errors, and reduced-motion support.
- Avoid gratuitous dependencies and decorative animations that harm loading or accessibility.

Official references to follow:
- Supabase Next.js quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- Supabase server-side auth: https://supabase.com/docs/guides/auth/server-side
- Supabase SSR client setup: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- Supabase Storage security: https://supabase.com/docs/guides/storage/security/access-control
- Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers

## 3. Brand and visual direction

Use the supplied `xentro-karting-poster.png` as the actual landing/sign-in background. Preserve the original image; do not crop away the kart/helmet focal point at the right. Add layered dark overlays only as needed to preserve contrast. Use the supplied Xentro logo image for the header, sign-up/sign-in card, splash/loading state, and branding. Derive browser favicons/app icons from the supplied logo mark where possible; keep the icon clean and legible at small sizes, and do not distort the full logo.

Brand palette should be sampled from the logo/poster, led by near-black, white, Xentro red, and bright racing yellow. Do not approximate with unrelated corporate blue/purple styling.

### Landing / signup design
- Desktop: racing poster as the full viewport background, with a translucent white/frosted floating registration panel aligned on the **left**. The kart should remain visibly recognizable on the **right**.
- The poster contains embedded text on its left; it is acceptable for the signup panel to cover some of that text so form readability takes priority. Keep the logo visible.
- The form panel must not run beyond the viewport. Use a sensible maximum width and inner scrolling or page scrolling on long forms. On mobile it should become a near-full-width, readable panel with a darkened poster behind it; no horizontal overflow.
- Main call-to-action buttons: polished 3D-inspired depth with restrained hover/press effects (CSS transforms/shadows are enough), red/yellow accents, clear disabled/loading states. Respect `prefers-reduced-motion`.

### Sign-in design
- Center a floating translucent/glass-style panel over the poster, with a readable logo, username field, password/passcode field, show/hide control, sign-in button, and “Forgot password?” link.
- Provide short, clear status messages without exposing private account details.
- Provide a branded loading/splash state for transitions only; do not create a long fake loading delay.

### Common UI
- Page title, favicon, open-graph/social metadata where appropriate, logo alt text, mobile responsiveness, consistent typography, and a small footer.
- No broken image paths, placeholder text, lorem ipsum, or “coming soon” for any Phase 1 screen.

## 4. Routes and user journeys

Choose one canonical, consistent route scheme and document it. The following is recommended:

- `/` — branded landing page with clear **Create Employee Account** and **Sign In** actions (and signup panel placement as the main landing experience).
- `/sign-up` — full employee registration form.
- `/sign-in` — centered username/password-passcode sign-in form.
- `/verify-email` — “check your inbox” confirmation state and resend-verification action if safely implemented with rate limits.
- `/auth/callback` — handles the supported Supabase PKCE/email confirmation callback, validates/exchanges the code safely, and routes back to sign-in with a success/error status.
- `/forgot-password` — email entry, generic confirmation feedback, resend cooldown.
- `/reset-password` — validates the recovery session/token then lets user set and confirm a new password/passcode.
- `/pending-approval` — explains that email is verified but the employee account is awaiting administrator approval.

Use fixed internal redirects and validate any `next` parameter against a local allowlist. Never allow open-redirect URLs supplied by a query string. Do not expose raw Supabase errors or sensitive values to users.

### Signup completion
1. Validate all form fields on the server.
2. Normalize/check username.
3. Create Supabase Auth account with email confirmation enabled and a safe redirect to the app's callback.
4. Save the employee profile and private avatar in a failure-safe way. If a profile/photo write fails after an Auth account was created, perform a safe compensating cleanup where possible (e.g. delete the newly created unverified Auth account) and report a non-sensitive error; log a correlation ID, not submitted personal data.
5. Return a “check your email” state. Do not create a logged-in session for an unverified user.
6. After a successful email verification link, send the user to `/sign-in?verified=1` (or an equivalent fixed redirect) with a success message. Handle expired, invalid, already-used, and incorrectly configured links gracefully.

Use the standard supported Supabase SSR/PKCE pattern for the installed libraries. Configure the email template and redirect URL requirements in documentation rather than relying on undocumented assumptions.

## 5. Signup form requirements

Collect the following employee data. All should be required unless a genuine browser/provider constraint prevents it; if a field is optional, clearly explain the reason and document that decision.

1. Username (unique, live availability status)
2. Full name
3. Age
4. Address
5. Bangladesh NID number
6. Blood group
7. Contact number
8. Emergency contact number
9. Designation
10. Registered email address
11. Employee photo
12. Password/passcode
13. Confirm password/passcode

### Username rules and live status
- Normalize by trimming whitespace and converting to lowercase. Use a documented allowlist such as lowercase letters, digits, dot, underscore, and hyphen; minimum length 3 and maximum length 24 unless the UX/design has a strong reason to use another documented bound.
- Keep the final normalized value consistent across the client, server, and database. Do not treat different capitalization as different usernames.
- Debounce availability requests (approximately 300–500 ms), cancel or ignore stale requests, and never let an earlier response overwrite the current input state.
- States: neutral while empty/typing; “Checking…” while request is in progress; green tick **only when the server says this valid normalized username is available**; taken state with “Username already exists. Try another username”; invalid-format state with instructions; network error state that does not falsely show a green tick.
- API response must contain only availability and safe validation/status fields. It must never return email, full name, user ID, or any other profile field.
- Enforce uniqueness in PostgreSQL using a unique constraint/index as well as client/server checks. Handle the race where two people check at once and submit the same username: only one signup succeeds.
- Send `Cache-Control: no-store` for availability/login responses. Add abuse protection/rate limits. The endpoint reveals username availability by design, but must reveal nothing else.

### Field validation
- **Full name:** trim, reasonable maximum length, reject empty/control characters.
- **Age:** store as a small integer, validate a documented sensible range (e.g. 1–120) and reject decimals/negative values. Do not silently guess an employment-age policy.
- **Address:** required, trim and set a maximum length.
- **NID:** preserve its required digit/string format and leading zeros; validate length using the policy the team can support and document it. Never coerce it to a JavaScript number.
- **Blood group:** select from a finite list: A+, A-, B+, B-, AB+, AB-, O+, O-.
- **Contact and emergency number:** store as strings; normalize reasonably, preserve `+880` and leading zeros; validate accepted Bangladesh/international formats without truncating digits.
- **Designation:** required; trim; maximum length; plain text (never rendered as raw HTML).
- **Email:** validate and normalize consistently for lookup/uniqueness; use the registered email for confirmation and recovery.
- **Photo:** accept safe raster images (JPEG/PNG/WebP), validate actual file type/content as well as extension/MIME, impose a documented size cap (target 2 MB), reject SVG and executable/ambiguous formats, and use a random server-generated filename. Do not trust client MIME, filenames, or storage paths. Show a client-side preview before submit.

### Password/passcode policy requested by product owner
The user requested either:
- a password of at least 6 characters containing at least one uppercase letter and at least one digit; **or**
- an exactly six-digit numeric passcode.

Support both modes with a clear selector/label and matching confirmation field. Both must become the user's Supabase Auth password; **never** store a password/passcode in the profile database or logs. Ensure the same rules are applied for registration, password change, and reset. Never hash passwords manually or create a custom password table.

Security note that must be documented: a permanent six-digit passcode has low entropy. Do not pretend it is equivalent to a strong password. Use Supabase Auth's built-in limits and implement additional shared/server-side abuse throttling for login, signup, username availability, and recovery. If an appropriate persistent rate limiter cannot be completed, clearly report the limitation rather than shipping an in-memory-only limiter on Vercel as the sole protection.

Provide show/hide toggles for password/passcode and confirmation, with accessible labels. Do not require users to type the password twice if there is a deliberate recoverable validation failure; preserve non-secret form inputs but clear secret inputs after submit/errors as appropriate.

## 6. Supabase Auth and username sign-in architecture

Supabase Auth authenticates with email/password, while the UI is required to accept username/password. Implement a server-only lookup from normalized username to registered email, then authenticate through Supabase Auth using the verified supported server-side/cookie-session pattern. Do not expose the registered email to the browser as an API response or embed it in any client bundle.

Implementation requirements:
- Use a separate server-only Supabase admin/service-role client for privileged lookup/profile/photo operations; it must never be imported by a client component.
- Keep `SUPABASE_SERVICE_ROLE_KEY` (or current equivalent secret key) server-only; never prefix it with `NEXT_PUBLIC_`, never log it, never commit it, and never expose it through API JSON.
- Use `@supabase/ssr` browser/server clients and cookie-based sessions according to the official docs for the installed versions. In Server Components and route handlers, validate the current user server-side. Do not trust a client-supplied user ID or the presence of a session cookie without verifying it.
- Sign-in failures should use a generic message such as “Username or password/passcode is incorrect” without revealing whether a username exists, whether an email is registered, or whether a password was wrong. A real authenticated `PENDING` user may receive a clear pending-approval message after credentials are proven valid.
- Do not leave a valid Supabase session cookie for `PENDING` or `SUSPENDED` accounts. Sign out/clear the session before redirecting to the status page.
- Verify `email_confirmed_at`/email verification using Supabase Auth's verified state, not a client-supplied `verified=true` flag. Supabase Auth should be configured to require email confirmation in hosted environments.
- If the current framework/session integration cannot reliably set/clear cookies from the login route, stop and follow official supported documentation rather than hand-rolling token storage.
- Add same-origin/Origin checks where appropriate on state-changing auth handlers, secure cookie settings provided by the supported SSR library, and safe fixed redirects.

### Signup implementation safety
Implement server validation, uniqueness checks, and an atomic/failure-safe account-creation path. Do not place sensitive form values into `auth.users.raw_user_meta_data` or JWT metadata. Keep private employee fields in the protected `profiles` table. If using an Auth trigger, it must create only safe minimal defaults and must not copy NID/address/phone into user metadata or logs. Make profile creation and any photo upload failures recoverable and documented. Avoid duplicate/orphan profiles.

## 7. Password recovery

- `/forgot-password` accepts the registered email address.
- Always show a generic confirmation, e.g. “If an account matches that email, a recovery link will be sent.” Do not confirm or deny registration of the email.
- Use Supabase Auth's password recovery flow and a configured redirect to `/reset-password` (or the supported recovery callback path). Verify the recovery session/token on the server and handle expired/invalid/replayed links.
- The reset form has new password/passcode + confirmation, visible show/hide control, policy hints, pending/loading/error states, and a success state that sends the user to sign-in.
- A recovery request must not immediately change the password. Only the validated recovery link/session may set it.
- Apply appropriate resend/request cooldowns and abuse limiting. Do not include the email, token, or password in application logs or analytics.

## 8. Account approval and privilege model

This is an internal employee management product and public self-signup must not create a privileged user. Use these defaults:
- Every new profile gets `role = 'EMPLOYEE'` and `status = 'PENDING'`.
- Email verification proves control of the registered email; it does not automatically grant access to future management modules.
- Only an explicitly authorized administrator can change status to `ACTIVE` or assign `SUPER_ADMIN`. Never accept a role/status from public signup input.
- Build no public “make me admin” flow.
- Because a full admin approval UI is out of Phase 1, provide a documented manual approval/bootstrap runbook with safe SQL examples using a verified account and explicit user UUID or normalized email. Make the instructions clear about where to run them and how to verify the result. Do not automatically promote the first registrant.
- All pages/routes for any future protected area must default-deny unless the current verified user is `ACTIVE`. The only Phase 1 destination after login can be a simple protected “Authentication setup complete” placeholder, not a management dashboard.
- Avoid recursive RLS policies. Any security-definer helper must have a tightly fixed `search_path`, least-privilege execute grants, and a specific justification.

## 9. Database schema and migration requirements

Create checked-in Supabase migration(s) under `supabase/migrations/`. Avoid manual-only database changes. Ensure migration SQL is readable, repeatable where appropriate, and reviewed for security. Provide equivalent commands/instructions for applying it with Supabase CLI or Dashboard SQL Editor if the CLI/project link is unavailable.

Create at least:

### `public.profiles`
- `id uuid primary key references auth.users(id) on delete cascade`
- `username text not null` (canonical normalized username)
- `username_normalized text not null unique` (or a single canonical username with a unique index; do not maintain conflicting sources)
- `email text not null` with a case-insensitive/normalized unique constraint (restricted to trusted server access and the account's own permitted reads)
- `full_name text not null`
- `age smallint not null`
- `address text not null`
- NID ciphertext-related fields, not plaintext
- `blood_group text not null` with a check constraint for supported values
- `contact_number text not null`
- `emergency_contact_number text not null`
- `designation text not null`
- `avatar_path text not null` (path only, not a public URL)
- `role text not null default 'EMPLOYEE'` constrained to approved values
- `status text not null default 'PENDING'` constrained to approved values
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Use appropriate checks, indexes, foreign keys, and an `updated_at` trigger. Avoid overexposing columns through client grants. If choosing different field naming, keep the schema consistent and document it. Store email privately for server-side username lookup; never let the username check return the email.

### NID data protection
NID is highly sensitive. Prefer application-layer authenticated encryption using Node's built-in crypto (AES-256-GCM or an equivalently maintained, authenticated scheme), with a random IV/nonce per value and a 32-byte key held only in a server-side environment variable such as `NID_ENCRYPTION_KEY`. Store ciphertext/IV/authentication tag/key version, not plaintext. Validate the key's format at startup/registration; if the required key is absent or invalid, fail safely and explain setup, **never silently fall back to plaintext**. Do not commit the key; provide a command to generate it locally and a key-rotation note. If a safer documented alternative is selected, explain the tradeoff to the user before relaxing this requirement.

### Security policies
- Enable RLS on `public.profiles`.
- Deny anonymous reads/writes to profiles.
- An authenticated user can read only their own profile unless a deliberate, reviewed admin policy is added. Phase 1 client roles should not be able to edit `role`, `status`, username, or private fields directly.
- Prefer profile creation/update through validated server handlers or carefully constrained policies. Avoid broad `USING (true)` or `WITH CHECK (true)` policies.
- Ensure Postgres grants do not accidentally allow access that the policies intend to deny.
- Never store credentials or passwords in `profiles`.
- If an Auth trigger is necessary, constrain execute privileges and harden the function; do not use unrestricted dynamic SQL.

### Employee photo storage
- Private bucket named `employee-photos` (or a documented equivalent).
- Enforce file size and allowed content types in bucket settings where supported, plus server-side file checks.
- Use generated paths scoped to the Auth user UUID; no user-provided paths.
- Direct anonymous download/list access must fail.
- For display, use short-lived signed URLs generated by a server endpoint only after verifying the requester and authorization.
- Do not store photos as database blobs or publish photos in a public bucket by default.

### Shared rate limiter
Use Supabase Auth's built-in limits plus a shared/persistent server-side limiter for application endpoints, particularly login, registration, username availability, and password recovery. Do not rely on an in-memory map as the only production control on serverless Vercel. If implementing a Postgres-backed limiter, keep the tables/functions locked down (RLS enabled, no anonymous direct table access, `EXECUTE` granted only to the trusted server role), hash/pepper identifying values, use atomic updates, add retention/cleanup, and test concurrent requests. Do not build an unreviewed `SECURITY DEFINER` function with a writable search path.

## 10. Environment and secret handling

Provide a `.env.example` with placeholders only, never real credentials. Expected variables include the values required by the current implementation, likely:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NID_ENCRYPTION_KEY=
```

If library versions or the Supabase project use a different supported public key variable, use the current documented name consistently. Never add service-role, encryption, SMTP, or other secret keys to client-prefixed variables. Validate required environment variables server-side with clear, non-secret error messages. Confirm `.env.local`, `.env.*.local`, build outputs, Playwright artifacts, and local test data are ignored by Git. A placeholder `.env.example` is safe to commit; `.env.local` is not.

Do not output secrets in logs, screenshots, reports, or chat. If a secret is accidentally printed, stop using it and instruct the owner to rotate it.

## 11. Email, Supabase, and Vercel setup docs

Write `README.md` that enables a fresh developer to run the app without guessing. Include:
- Requirements and install commands.
- Copy `.env.example` to `.env.local`, and exactly where the user obtains each value in Supabase.
- How to run the local app.
- How to start local Supabase/email tooling if installed.
- How to apply migrations and storage policies.
- Supabase Auth settings: enable email confirmation; configure Site URL and Redirect URLs for localhost and the actual Vercel Preview/Production domains; set the correct confirmation/recovery email template redirect expected by the implemented callback.
- SMTP provider configuration for reliable testing/production email. Never claim email delivery works until actually tested. The built-in sender is for testing and has strict sending limits; document that a real SMTP provider is recommended before production.
- Vercel environment variables for Preview and Production separately, domain/redirect settings, and how to deploy a Preview safely.
- Safe admin bootstrap/approval runbook.
- Troubleshooting for email links, expired tokens, storage policies, and environment mismatch.

Do not invent a working email sender, project URL, deploy URL, or credentials. If SMTP or Supabase settings are not provided, make the local app graceful and mark integration tests that require those settings as blocked.

## 12. Testing and quality gates — release cannot be marked complete until reported

Build a test checklist in `TEST_PLAN.md` and automated tests where possible. Verify these cases:

### Registration and form
- All required fields show useful validation.
- Password and confirm must match.
- Both explicitly specified password formats are accepted; invalid formats rejected.
- Show/hide buttons work and are accessible.
- Username normalizes consistently; empty/invalid/checking/taken/available/offline states all work.
- Green availability tick appears only after a successful, current database response.
- Network failure never appears as “available.” Stale responses cannot override new input.
- Parallel signup attempts with the same username result in at most one user/profile.
- Duplicate/failed signup cannot leave an unintended active profile or public photo.
- Invalid/malicious file types, oversized photos, arbitrary filenames, and SVG uploads are rejected.
- NID is never saved as plaintext, returned in a public API response, or logged.

### Email verification
- Valid link completes the configured PKCE/verification flow, then redirects to sign-in with success feedback.
- Invalid, expired, already-used, and wrong-environment links show safe recovery guidance.
- Unverified users cannot get an active app session or enter protected pages.

### Login/session/approval
- Active, verified user can sign in using username + accepted password/passcode.
- Wrong username or secret has a generic error.
- Unknown username does not reveal a private email or profile data.
- Pending account with valid credentials is not granted an active session; user sees the pending explanation.
- Suspended, unverified, expired-session, and signed-out cases are handled correctly.
- Session is validated server-side; private pages/API routes reject anonymous access.
- Open redirect attempts fail.

### Password recovery
- Registered and unregistered email submissions produce the same public response.
- Valid reset email link works; expired/replayed/invalid links fail safely.
- New password/passcode and confirmation follow the same password policy.
- Reset actually changes the Supabase Auth credential; old credential fails and new credential works.
- Request cooldown/rate-limit behavior is verified.

### Database, storage, and security
- Anonymous user cannot select, insert, update, or delete employee profiles.
- An authenticated employee cannot read another employee's profile or update role/status/private data.
- Username uniqueness and normalized email uniqueness are enforced by the database.
- Private photos cannot be downloaded anonymously and signed URLs expire.
- Service-role secret is absent from browser JS, source maps, client responses, and Git.
- SQL policies/functions are checked for recursion, unsafe search paths, excessive grants, and public execution.
- Application logs do not contain password, passcode, NID, full address, photo bytes, reset code, or session tokens.

### Build/UI
- Run and report actual results for lint, typecheck, unit/integration tests, browser tests where configured, and production build (e.g. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; define scripts that really exist).
- Inspect pages in a desktop size and mobile size; no clipped form controls, horizontal scroll, broken assets, unlabelled inputs, unreadable text, or inaccessible keyboard controls.
- Confirm reduced-motion behavior.

Do not mark Phase 1 “complete” if a required test fails. Fix it or explicitly mark the blocker with reproduction steps and cause.

## 13. Expected deliverables

At completion, the project should include, as applicable:
- Working Next.js application source code.
- `assets/source/` originals plus optimized public copies of the supplied images.
- Supabase migrations and private Storage setup/policies.
- Server-side Supabase clients and validated route handlers/actions.
- Signup, username availability, verify-email, sign-in, forgot-password, reset-password, callback, and pending-approval UI.
- `README.md`, `.env.example`, `IMPLEMENTATION_LOG.md`, `TEST_PLAN.md`, and safe admin-approval/bootstrap instructions.
- Automated tests and real passing lint/typecheck/build results.
- A short final report: what is implemented; exact commands run and outcomes; migrations created/applied; environment variables still needed (names only, never values); real Supabase/email/Vercel tests that passed; known limitations; and exact next action for the user.

## 14. Definition of done

Phase 1 is done only when all of the following are true:

1. The app starts locally using documented commands.
2. The supplied poster and logo are used correctly throughout the branded auth experience.
3. Username availability is database-backed, responsive, race-safe at the database layer, and reveals no personal data.
4. Signup captures all required employee fields, stores no plaintext NID, stores no password in the profile database, and sends a configured confirmation email when Supabase/SMTP is configured.
5. The verification link completes the supported flow and redirects to sign-in.
6. Username/password or passcode sign-in works via a private server-side username-to-email lookup and verified cookie session.
7. Forgot-password and reset-password work through real Supabase Auth when email is configured.
8. Pending/suspended users cannot enter protected sections; no public privilege escalation exists.
9. Profile RLS and private storage controls pass the documented security tests.
10. Lint, typecheck, automated tests, and production build pass, or each blocker is explicitly listed and not misrepresented as a pass.
11. The README accurately distinguishes code that works from settings still requiring human configuration.
12. No changes have been made to any unrelated repository, no secrets were committed, and no production deployment/migration happened without authorization.

**Begin now:** inspect the specified directory and available assets, then implement. Do not reply with only a plan. Ask the product owner a question only when it blocks a safe, correct implementation; otherwise follow these defaults and document them.
