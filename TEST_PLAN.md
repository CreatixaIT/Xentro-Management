# Xentro Management - Test Plan

## Phase 1 Test Cases

### Automated Tests (Not Yet Implemented)

#### Unit Tests
- [ ] `encryptNID()` - encrypts NID correctly with valid key
- [ ] `decryptNID()` - decrypts NID correctly with valid ciphertext/IV/tag
- [ ] `validateEncryptionKey()` - rejects invalid key formats
- [ ] `validateEnv()` - throws error when required vars missing
- [ ] `checkRateLimit()` - returns allowed=true under limit
- [ ] `checkRateLimit()` - returns allowed=false over limit
- [ ] `getClientIp()` - extracts IP from x-forwarded-for header
- [ ] `getClientIp()` - extracts IP from x-real-ip header
- [ ] `getClientIp()` - returns 'unknown' when no headers present
- [ ] Username normalization - trims and lowercases correctly
- [ ] All Zod schemas - validate correct inputs
- [ ] All Zod schemas - reject invalid inputs

#### Integration Tests
- [ ] `/api/check-username` - returns available for new username
- [ ] `/api/check-username` - returns taken for existing username
- [ ] `/api/check-username` - validates username format
- [ ] `/api/check-username` - rate limits excessive requests
- [ ] `/api/sign-up` - creates account with valid data
- [ ] `/api/sign-up` - rejects duplicate username
- [ ] `/api/sign-up` - rejects duplicate email
- [ ] `/api/sign-up` - encrypts NID (check database)
- [ ] `/api/sign-up` - uploads photo to private storage
- [ ] `/api/sign-up` - fails and cleans up auth user on profile error
- [ ] `/api/sign-in` - authenticates with correct credentials
- [ ] `/api/sign-in` - rejects wrong password
- [ ] `/api/sign-in` - rejects unknown username
- [ ] `/api/sign-in` - redirects pending users to pending-approval
- [ ] `/api/sign-in` - rejects unverified users
- [ ] `/api/sign-in` - rate limits excessive attempts
- [ ] `/api/forgot-password` - sends recovery email
- [ ] `/api/forgot-password` - returns generic message for unregistered email
- [ ] `/api/forgot-password` - rate limits excessive requests
- [ ] `/api/reset-password` - updates password with valid token
- [ ] `/api/reset-password` - rejects expired/invalid tokens
- [ ] `/api/reset-password` - rate limits excessive attempts

#### Database Tests
- [ ] RLS policy - anonymous user cannot read profiles
- [ ] RLS policy - anonymous user cannot write profiles
- [ ] RLS policy - authenticated user can read own profile
- [ ] RLS policy - authenticated user cannot read other profiles
- [ ] RLS policy - service role can read all profiles
- [ ] Unique constraint - username_normalized enforces uniqueness
- [ ] Unique constraint - email enforces uniqueness
- [ ] Storage policy - anonymous user cannot download photos
- [ ] Storage policy - user can upload own photo
- [ ] Rate limiter function - increments correctly
- [ ] Rate limiter function - expires old entries

### Manual Test Cases

#### Registration Flow
1. **Valid Registration**
   - Navigate to `/`
   - Click "Create Employee Account"
   - Fill all fields with valid data
   - Upload valid photo (JPEG/PNG/WebP, <2MB)
   - Select password mode and enter valid password/passcode
   - Submit
   - Verify redirect to `/verify-email`
   - Check Supabase Auth - user created with email confirmation enabled
   - Check profiles table - profile created with encrypted NID
   - Check storage - photo uploaded to private bucket

2. **Username Availability**
   - Type username in sign-up form
   - Verify "Checking..." state appears
   - Verify green tick appears for available username
   - Verify "Username already exists" message for taken username
   - Verify format validation for invalid characters
   - Try to submit with taken username - should fail

3. **Validation Errors**
   - Submit without required fields - should show inline errors
   - Enter invalid email format - should show error
   - Enter invalid NID format - should show error
   - Enter invalid phone format - should show error
   - Upload SVG or executable - should reject
   - Upload >2MB photo - should reject
   - Password and confirm mismatch - should show error
   - Password too short - should show error
   - Passcode not 6 digits - should show error

4. **Duplicate Prevention**
   - Register with username "testuser"
   - Try to register again with "testuser" - should fail
   - Try to register with "TestUser" (different case) - should fail (normalized)
   - Register with email "test@example.com"
   - Try to register again with "test@example.com" - should fail

#### Email Verification Flow
1. **Valid Verification**
   - Register a new account
   - Click verification link from email (requires Supabase SMTP or local email viewer)
   - Verify redirect to `/sign-in?verified=1`
   - Verify success message displayed
   - Try to sign in - should succeed

2. **Invalid/Expired Link**
   - Try to use expired verification link
   - Try to use already-used verification link
   - Try to use malformed verification link
   - Verify appropriate error handling

#### Sign-In Flow
1. **Valid Sign-In**
   - Register and verify an account
   - Navigate to `/sign-in`
   - Enter username and correct password
   - Submit
   - Verify redirect to `/dashboard`
   - Verify session cookie set
   - Verify user profile displayed

2. **Invalid Credentials**
   - Enter correct username, wrong password
   - Verify generic error message
   - Verify no indication of whether username exists
   - Enter unknown username, any password
   - Verify same generic error message

3. **Passcode Sign-In**
   - Register with 6-digit passcode
   - Sign in with passcode
   - Verify success

4. **Pending Account**
   - Create account but don't approve (status = PENDING)
   - Sign in with correct credentials
   - Verify redirect to `/pending-approval`
   - Verify no active session created

5. **Unverified Account**
   - Create account but don't click verification link
   - Try to sign in
   - Verify error message requiring email verification

6. **Suspended Account**
   - Manually set status = SUSPENDED in database
   - Try to sign in
   - Verify error message about suspension

#### Password Recovery Flow
1. **Valid Recovery**
   - Navigate to `/forgot-password`
   - Enter registered email
   - Submit
   - Verify generic success message
   - Check email for recovery link
   - Click recovery link
   - Enter new valid password/passcode
   - Submit
   - Verify redirect to `/sign-in`
   - Sign in with new password - should work
   - Sign in with old password - should fail

2. **Unregistered Email**
   - Enter unregistered email in forgot password
   - Verify same generic success message (no enumeration)

3. **Rate Limiting**
   - Submit forgot password 4 times quickly
   - 5th attempt should show rate limit error
   - Wait 5 minutes or adjust limit in code

4. **Invalid Reset Link**
   - Try to use expired reset link
   - Try to use already-used reset link
   - Verify appropriate error handling

#### Dashboard and Protected Routes
1. **Authenticated Access**
   - Sign in with active account
   - Navigate to `/dashboard`
   - Verify profile data displayed
   - Verify sign-out button works

2. **Unauthenticated Access**
   - Sign out
   - Try to navigate to `/dashboard`
   - Verify redirect to `/sign-in`

3. **Session Persistence**
   - Sign in
   - Refresh page
   - Verify still logged in
   - Close and reopen browser
   - Verify still logged in (if cookie persists)

#### Security Tests
1. **NID Encryption**
   - Register with test NID
   - Query profiles table directly
   - Verify `nid_ciphertext` is not plaintext
   - Verify cannot decrypt without key

2. **Private Storage**
   - Try to access photo URL directly in browser
   - Verify 403 or 404 error
   - Check that photos are not publicly accessible

3. **Service Role Key Exposure**
   - Build production bundle
   - Search bundle for `SUPABASE_SERVICE_ROLE_KEY`
   - Verify not present in client-side JavaScript

4. **Email Enumeration**
   - Try to register with existing email
   - Verify error doesn't reveal that email exists
   - Try forgot password with existing email
   - Verify generic message for both existing and non-existing emails

5. **Username Enumeration**
   - Try to sign in with unknown username
   - Verify error doesn't reveal whether username exists
   - Check username availability endpoint - should only return availability, not email

6. **Rate Limiting**
   - Make 31 username check requests in 1 minute
   - Verify 31st request returns 429
   - Check rate limit headers in response
   - Wait 1 minute - verify requests work again

#### UI/UX Tests
1. **Responsive Design**
   - Open on mobile (<768px)
   - Verify signup panel is full-width
   - Verify no horizontal scroll
   - Verify form controls are touch-friendly
   - Open on desktop (>=1024px)
   - Verify signup panel on left, kart visible on right

2. **Accessibility**
   - Navigate with keyboard only
   - Verify tab order is logical
   - Verify focus states visible
   - Verify all inputs have labels
   - Verify screen reader announces errors
   - Verify reduced-motion preference respected

3. **Visual Consistency**
   - Verify Xentro logo appears on all pages
   - Verify karting poster as background
   - Verify color scheme consistent (red, yellow, black)
   - Verify glass-panel styling consistent
   - Verify no broken images

4. **Error Handling**
   - Disconnect network
   - Try to submit form
   - Verify appropriate error message
   - Reconnect network
   - Verify form still functional

### Test Results Template

```
Date: YYYY-MM-DD
Tester: [Name]
Environment: [Local/Production/Preview]

Registration Flow:
- Valid Registration: PASS/FAIL
- Username Availability: PASS/FAIL
- Validation Errors: PASS/FAIL
- Duplicate Prevention: PASS/FAIL

Email Verification Flow:
- Valid Verification: PASS/FAIL
- Invalid/Expired Link: PASS/FAIL

Sign-In Flow:
- Valid Sign-In: PASS/FAIL
- Invalid Credentials: PASS/FAIL
- Passcode Sign-In: PASS/FAIL
- Pending Account: PASS/FAIL
- Unverified Account: PASS/FAIL
- Suspended Account: PASS/FAIL

Password Recovery Flow:
- Valid Recovery: PASS/FAIL
- Unregistered Email: PASS/FAIL
- Rate Limiting: PASS/FAIL
- Invalid Reset Link: PASS/FAIL

Dashboard and Protected Routes:
- Authenticated Access: PASS/FAIL
- Unauthenticated Access: PASS/FAIL
- Session Persistence: PASS/FAIL

Security Tests:
- NID Encryption: PASS/FAIL
- Private Storage: PASS/FAIL
- Service Role Key Exposure: PASS/FAIL
- Email Enumeration: PASS/FAIL
- Username Enumeration: PASS/FAIL
- Rate Limiting: PASS/FAIL

UI/UX Tests:
- Responsive Design: PASS/FAIL
- Accessibility: PASS/FAIL
- Visual Consistency: PASS/FAIL
- Error Handling: PASS/FAIL

Notes:
[Additional observations, issues found, etc.]
```

### Browser Testing Matrix

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | |
| Firefox | Latest | |
| Safari | Latest | |
| Edge | Latest | |
| Mobile Safari | iOS 17+ | |
| Mobile Chrome | Android 13+ | |

### Device Testing Matrix

| Device | Screen Size | Status |
|--------|-------------|--------|
| Desktop | 1920x1080 | |
| Laptop | 1366x768 | |
| Tablet | 768x1024 | |
| Mobile | 375x667 | |
| Mobile Large | 414x896 | |

---

**Test Execution Status**: Not yet executed
**Automated Tests**: Not implemented
**Manual Tests**: Ready for execution after Supabase setup
