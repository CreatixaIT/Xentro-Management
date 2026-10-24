import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { encryptNID } from '@/lib/encryption';
import {
  usernameSchema,
  fullNameSchema,
  ageSchema,
  addressSchema,
  nidSchema,
  phoneSchema,
  designationSchema,
  emailSchema,
  passwordOrPasscodeSchema,
} from '@/lib/validation';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  try {
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

    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(clientIp, 'sign-up', 5, 300); // 5 requests per 5 minutes

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: 'Too many signup attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    }

    const formData = await request.formData();

    // Extract form fields
    const username = formData.get('username') as string;
    const fullName = formData.get('fullName') as string;
    const age = formData.get('age') as string;
    const address = formData.get('address') as string;
    const nid = formData.get('nid') as string;
    const bloodGroup = formData.get('bloodGroup') as string;
    const contactNumber = formData.get('contactNumber') as string;
    const emergencyContactNumber = formData.get('emergencyContactNumber') as string;
    const designation = formData.get('designation') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const photo = formData.get('photo') as File;

    // Validate all fields
    const errors: Record<string, string> = {};

    try {
      usernameSchema.parse(username);
    } catch (e) {
      errors.username = 'Invalid username format';
    }

    try {
      fullNameSchema.parse(fullName);
    } catch (e) {
      errors.fullName = 'Invalid full name';
    }

    try {
      ageSchema.parse(parseInt(age, 10));
    } catch (e) {
      errors.age = 'Invalid age (must be 1-120)';
    }

    try {
      addressSchema.parse(address);
    } catch (e) {
      errors.address = 'Invalid address';
    }

    try {
      nidSchema.parse(nid);
    } catch (e) {
      errors.nid = 'Invalid NID format';
    }

    if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
      errors.bloodGroup = 'Invalid blood group';
    }

    try {
      phoneSchema.parse(contactNumber);
    } catch (e) {
      errors.contactNumber = 'Invalid contact number';
    }

    try {
      phoneSchema.parse(emergencyContactNumber);
    } catch (e) {
      errors.emergencyContactNumber = 'Invalid emergency contact number';
    }

    try {
      designationSchema.parse(designation);
    } catch (e) {
      errors.designation = 'Invalid designation';
    }

    try {
      emailSchema.parse(email);
    } catch (e) {
      errors.email = 'Invalid email address';
    }

    try {
      passwordOrPasscodeSchema.parse(password);
    } catch (e) {
      errors.password = 'Invalid password or passcode format';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Password and confirm password do not match';
    }

    // Validate photo
    if (!photo || !(photo instanceof File)) {
      errors.photo = 'Photo is required';
    } else {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(photo.type)) {
        errors.photo = 'Photo must be JPEG, PNG, or WebP format';
      }
      if (photo.size > 2 * 1024 * 1024) {
        errors.photo = 'Photo must be at most 2MB';
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Normalize username
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check username availability again (race condition protection)
    const serviceRoleClient = createServiceRoleClient();
    const { data: existingUsername } = await serviceRoleClient
      .from('profiles')
      .select('username_normalized')
      .eq('username_normalized', normalizedUsername)
      .maybeSingle();

    if (existingUsername) {
      errors.username = 'Username already exists. Try another username.';
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Check email availability
    const { data: existingEmail } = await serviceRoleClient
      .from('profiles')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingEmail) {
      errors.email = 'An account with this email already exists.';
      return NextResponse.json({ errors }, { status: 400 });
    }

    // Encrypt NID
    const encryptionKey = process.env.NID_ENCRYPTION_KEY!;
    const { ciphertext: nidCiphertext, iv: nidIv, authTag: nidAuthTag } = encryptNID(nid, encryptionKey);

    // Create Supabase Auth user using admin API (bypasses email verification)
    // Email verification is temporarily disabled due to SMTP configuration issues
    // New accounts remain PENDING until Super Admin approval
    const { data: authData, error: authError } = await serviceRoleClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true, // Mark as confirmed without sending email
      user_metadata: {
        username: normalizedUsername,
      },
    });

    if (authError) {
      console.error(`[Signup][${correlationId}] Auth signup error:`, authError);
      return NextResponse.json(
        { message: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      console.error(`[Signup][${correlationId}] Auth signup returned no user`);
      return NextResponse.json(
        { message: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    try {
      // Upload photo to private storage
      const fileExt = photo.name.split('.').pop();
      const fileName = `${userId}/${randomUUID()}.${fileExt}`;
      const { error: uploadError } = await serviceRoleClient.storage
        .from('employee-photos')
        .upload(fileName, photo, {
          upsert: false,
        });

      if (uploadError) {
        console.error(`[Signup][${correlationId}] Photo upload failed:`, uploadError);
        throw new Error(`Photo upload failed: ${uploadError.message}`);
      }

      // Create profile
      const { error: profileError } = await serviceRoleClient
        .from('profiles')
        .insert({
          id: userId,
          username: normalizedUsername,
          username_normalized: normalizedUsername,
          email: normalizedEmail,
          full_name: fullName,
          age: parseInt(age, 10),
          address,
          nid_ciphertext: nidCiphertext,
          nid_iv: nidIv,
          nid_auth_tag: nidAuthTag,
          blood_group: bloodGroup,
          contact_number: contactNumber,
          emergency_contact_number: emergencyContactNumber,
          designation,
          avatar_path: fileName,
          role: 'EMPLOYEE',
          status: 'PENDING',
        });

      if (profileError) {
        console.error(`[Signup][${correlationId}] Profile creation failed:`, profileError);
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Registration submitted successfully. Your account is awaiting Super Admin approval.',
        },
        {
          status: 201,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt || '',
          },
        }
      );
    } catch (error) {
      // Cleanup: delete auth user if profile creation failed
      console.error(`[Signup][${correlationId}] Profile creation error, cleaning up auth user:`, error);
      await serviceRoleClient.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { message: 'Failed to complete registration. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`[Signup][${correlationId}] Unexpected error:`, error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
