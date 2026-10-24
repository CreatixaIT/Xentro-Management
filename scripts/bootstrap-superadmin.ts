#!/usr/bin/env tsx
/**
 * Super Admin Bootstrap Script
 *
 * This script creates the initial Super Admin account for Xentro Management.
 * It reads credentials from environment variables to avoid hardcoding secrets.
 *
 * Usage:
 *   SUPERADMIN_USERNAME=superadmin \
 *   SUPERADMIN_PASSCODE=924040 \
 *   SUPERADMIN_EMAIL=xentrobd@gmail.com \
 *   tsx scripts/bootstrap-superadmin.ts
 *
 * Environment Variables:
 *   SUPERADMIN_USERNAME - Username for the super admin (default: superadmin)
 *   SUPERADMIN_PASSCODE - Initial 6-digit passcode (required)
 *   SUPERADMIN_EMAIL - Email address (default: xentrobd@gmail.com)
 *   SUPERADMIN_FULL_NAME - Full name (default: Super admin)
 *   SUPERADMIN_DESIGNATION - Job title (default: Founder)
 *   SUPERADMIN_NID - NID number (default: 12345678)
 *   SUPERADMIN_CONTACT - Contact number (default: 01703063331)
 *   SUPERADMIN_EMERGENCY_CONTACT - Emergency contact (default: 01703063331)
 *   SUPERADMIN_BLOOD_GROUP - Blood group (default: B+)
 *   SUPERADMIN_ADDRESS - Address (default: Khulshi, Chittagong)
 */

import { createClient } from '@supabase/supabase-js';
import { encryptNID } from '../src/lib/encryption';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  process.exit(1);
}

const superAdminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
const superAdminPasscode = process.env.SUPERADMIN_PASSCODE;
const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'xentrobd@gmail.com';
const superAdminFullName = process.env.SUPERADMIN_FULL_NAME || 'Super admin';
const superAdminDesignation = process.env.SUPERADMIN_DESIGNATION || 'Founder';
const superAdminNID = process.env.SUPERADMIN_NID || '12345678';
const superAdminContact = process.env.SUPERADMIN_CONTACT || '01703063331';
const superAdminEmergencyContact = process.env.SUPERADMIN_EMERGENCY_CONTACT || '01703063331';
const superAdminBloodGroup = process.env.SUPERADMIN_BLOOD_GROUP || 'B+';
const superAdminAddress = process.env.SUPERADMIN_ADDRESS || 'Khulshi, Chittagong';

if (!superAdminPasscode) {
  console.error('Error: SUPERADMIN_PASSCODE must be set');
  process.exit(1);
}

if (!/^\d{6}$/.test(superAdminPasscode)) {
  console.error('Error: SUPERADMIN_PASSCODE must be exactly 6 digits');
  process.exit(1);
}

const nidEncryptionKey = process.env.NID_ENCRYPTION_KEY;
if (!nidEncryptionKey) {
  console.error('Error: NID_ENCRYPTION_KEY must be set');
  process.exit(1);
}

console.log('=== Xentro Management Super Admin Bootstrap ===\n');
console.log('Configuration:');
console.log(`  Username: ${superAdminUsername}`);
console.log(`  Email: ${superAdminEmail}`);
console.log(`  Full Name: ${superAdminFullName}`);
console.log(`  Designation: ${superAdminDesignation}`);
console.log(`  NID: ${superAdminNID}`);
console.log(`  Contact: ${superAdminContact}`);
console.log(`  Blood Group: ${superAdminBloodGroup}`);
console.log(`  Address: ${superAdminAddress}`);
console.log(`  Passcode: ****** (never logged or stored in plaintext)\n`);

// Create service role client
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function bootstrap() {
  try {
    // Check if user already exists
    console.log('Checking for existing account...');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, email, role, status')
      .eq('username_normalized', superAdminUsername.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      console.log(`\nAccount already exists:`);
      console.log(`  Username: ${existingProfile.username}`);
      console.log(`  Email: ${existingProfile.email}`);
      console.log(`  Role: ${existingProfile.role}`);
      console.log(`  Status: ${existingProfile.status}`);

      if (existingProfile.role === 'SUPER_ADMIN' && existingProfile.status === 'ACTIVE') {
        console.log('\n✓ Super Admin account is already configured correctly');
        console.log('No changes made.');
        return;
      }

      console.log('\nPromoting existing account to Super Admin...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        process.exit(1);
      }

      console.log('✓ Account promoted to Super Admin');
      return;
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('email', superAdminEmail.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      console.log(`\nEmail already registered to username: ${existingEmail.username}`);
      console.log('Please use a different email or delete the existing account first.');
      process.exit(1);
    }

    // Create Supabase Auth user
    console.log('Creating Supabase Auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: superAdminEmail.toLowerCase(),
      password: superAdminPasscode,
      email_confirm: true,
      user_metadata: {
        username: superAdminUsername,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating Auth user:', authError);
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`✓ Auth user created: ${userId}`);

    // Encrypt NID
    console.log('Encrypting NID...');
    const { ciphertext: nidCiphertext, iv: nidIv, authTag: nidAuthTag } = encryptNID(
      superAdminNID,
      nidEncryptionKey!
    );
    console.log('✓ NID encrypted');

    // Upload placeholder avatar (skip for now, use empty path)
    const avatarPath = `${userId}/placeholder.txt`;

    // Create profile
    console.log('Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: superAdminUsername,
        username_normalized: superAdminUsername.toLowerCase(),
        email: superAdminEmail.toLowerCase(),
        full_name: superAdminFullName,
        age: 30, // Default age
        address: superAdminAddress,
        nid_ciphertext: nidCiphertext,
        nid_iv: nidIv,
        nid_auth_tag: nidAuthTag,
        blood_group: superAdminBloodGroup,
        contact_number: superAdminContact,
        emergency_contact_number: superAdminEmergencyContact,
        designation: superAdminDesignation,
        avatar_path: avatarPath,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Cleanup Auth user
      await supabase.auth.admin.deleteUser(userId);
      process.exit(1);
    }

    console.log('✓ Profile created');
    console.log('\n=== Bootstrap Complete ===');
    console.log('\nSuper Admin account created successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`  Username: ${superAdminUsername}`);
    console.log(`  Passcode: ${superAdminPasscode}`);
    console.log(`  Email: ${superAdminEmail}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('  1. Change this passcode immediately after first login');
    console.log('  2. Do not share these credentials');
    console.log('  3. Store the passcode securely');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

bootstrap();
