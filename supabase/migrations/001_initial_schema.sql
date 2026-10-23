-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age SMALLINT NOT NULL CHECK (age >= 1 AND age <= 120),
  address TEXT NOT NULL,
  nid_ciphertext TEXT NOT NULL,
  nid_iv TEXT NOT NULL,
  nid_auth_tag TEXT NOT NULL,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  contact_number TEXT NOT NULL,
  emergency_contact_number TEXT NOT NULL,
  designation TEXT NOT NULL,
  avatar_path TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('EMPLOYEE', 'SUPER_ADMIN')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_username_normalized ON public.profiles(username_normalized);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Helper function to verify role/status haven't changed during profile update
-- This SECURITY DEFINER function has fixed search_path and auth.uid() check
-- Prevents RLS recursion by bypassing RLS to check current values
CREATE OR REPLACE FUNCTION verify_profile_unchanged_fields(
  p_id UUID,
  p_new_role TEXT,
  p_new_status TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_role TEXT;
  v_current_status TEXT;
BEGIN
  -- Verify the user is updating their own profile
  IF auth.uid() IS DISTINCT FROM p_id THEN
    RETURN FALSE;
  END IF;

  -- Get current role and status (bypasses RLS via SECURITY DEFINER)
  SELECT role, status INTO v_current_role, v_current_status
  FROM public.profiles
  WHERE id = p_id;

  -- Ensure role and status haven't changed
  RETURN v_current_role = p_new_role AND v_current_status = p_new_status;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (restricted fields)
-- Cannot change role or status - those require admin approval
-- Uses helper function verify_profile_unchanged_fields to prevent RLS recursion
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND verify_profile_unchanged_fields(id, role, status)
  );

-- Service role can insert profiles (for signup)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can read all profiles (for admin operations)
CREATE POLICY "Service role can view all profiles"
  ON public.profiles
  FOR SELECT
  TO service_role
  USING (true);

-- Service role can update all profiles (for admin operations)
CREATE POLICY "Service role can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access"
  ON public.profiles
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT ON public.profiles TO authenticated;
