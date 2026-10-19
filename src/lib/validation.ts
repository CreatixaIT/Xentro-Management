import { z } from 'zod';

// Blood group options
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

// Username validation: lowercase letters, digits, dot, underscore, hyphen
// 3-24 characters
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(
    /^[a-z0-9._-]+$/,
    'Username can only contain lowercase letters, digits, dot, underscore, and hyphen'
  );

// Password validation: at least 6 characters, one uppercase, one digit
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

// Passcode validation: exactly 6 digits
export const passcodeSchema = z
  .string()
  .length(6, 'Passcode must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Passcode must be exactly 6 digits');

// Combined password/passcode validation
export const passwordOrPasscodeSchema = z.union([
  passwordSchema,
  passcodeSchema,
]);

// NID validation (Bangladesh NID - typically 10 or 13 digits)
// We'll accept 10-17 digits to accommodate variations
export const nidSchema = z
  .string()
  .min(10, 'NID must be at least 10 digits')
  .max(17, 'NID must be at most 17 digits')
  .regex(/^\d+$/, 'NID must contain only digits');

// Phone number validation (Bangladesh format)
export const phoneSchema = z
  .string()
  .min(11, 'Phone number must be at least 11 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^\+?\d+$/, 'Phone number must contain only digits and optional + prefix');

// Full name validation
export const fullNameSchema = z
  .string()
  .min(2, 'Full name must be at least 2 characters')
  .max(100, 'Full name must be at most 100 characters')
  .regex(/^[a-zA-Z\s\-\.]+$/, 'Full name can only contain letters, spaces, hyphens, and periods');

// Address validation
export const addressSchema = z
  .string()
  .min(5, 'Address must be at least 5 characters')
  .max(500, 'Address must be at most 500 characters');

// Age validation
export const ageSchema = z
  .number()
  .int('Age must be a whole number')
  .min(1, 'Age must be at least 1')
  .max(120, 'Age must be at most 120');

// Designation validation
export const designationSchema = z
  .string()
  .min(2, 'Designation must be at least 2 characters')
  .max(100, 'Designation must be at most 100 characters');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Signup form schema
export const signupSchema = z.object({
  username: usernameSchema,
  fullName: fullNameSchema,
  age: ageSchema,
  address: addressSchema,
  nid: nidSchema,
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid blood group' }),
  }),
  contactNumber: phoneSchema,
  emergencyContactNumber: phoneSchema,
  designation: designationSchema,
  email: emailSchema,
  password: passwordOrPasscodeSchema,
  confirmPassword: z.string(),
  photo: z.any().refine(
    (file) => file instanceof File,
    'Photo is required'
  ).refine(
    (file) => {
      if (!(file instanceof File)) return false;
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      return validTypes.includes(file.type);
    },
    'Photo must be JPEG, PNG, or WebP format'
  ).refine(
    (file) => {
      if (!(file instanceof File)) return false;
      return file.size <= 2 * 1024 * 1024; // 2MB
    },
    'Photo must be at most 2MB'
  ),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
  }
);

// Sign-in schema
export const signInSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password or passcode is required'),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
  password: passwordOrPasscodeSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Password and confirm password do not match',
    path: ['confirmPassword'],
  }
);

// Username availability check response
export const usernameAvailabilitySchema = z.object({
  available: z.boolean(),
  message: z.string().optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
