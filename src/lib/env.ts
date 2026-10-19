import { validateEncryptionKey } from './encryption';

/**
 * Validates all required environment variables on server startup
 * Throws an error if any required variable is missing or invalid
 */
export function validateEnv(): void {
  const requiredVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NID_ENCRYPTION_KEY',
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env.local and fill in the required values.'
    );
  }

  // Validate encryption key format
  try {
    validateEncryptionKey(process.env.NID_ENCRYPTION_KEY!);
  } catch (error) {
    throw new Error(
      `Invalid NID_ENCRYPTION_KEY: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get a sanitized error message for missing environment variables
 * Does not expose secret values
 */
export function getEnvErrorMessage(): string {
  const requiredVars = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NID_ENCRYPTION_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length === 0) {
    return 'All environment variables are configured.';
  }

  return `Missing required environment variables: ${missing.join(', ')}. ` +
    'Please copy .env.example to .env.local and fill in the required values.';
}
