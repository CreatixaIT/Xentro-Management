export interface Profile {
  id: string;
  username: string;
  username_normalized: string;
  email: string;
  full_name: string;
  age: number;
  address: string;
  nid_ciphertext: string;
  nid_iv: string;
  nid_auth_tag: string;
  blood_group: string;
  contact_number: string;
  emergency_contact_number: string;
  designation: string;
  avatar_path: string;
  role: 'EMPLOYEE' | 'SUPER_ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface UsernameAvailabilityResponse {
  available: boolean;
  message?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface SignupResult {
  success: boolean;
  message: string;
  correlationId?: string;
}

export interface SignInResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}
