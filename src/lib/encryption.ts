import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Validates that the NID_ENCRYPTION_KEY is a valid 32-byte hex string
 */
export function validateEncryptionKey(key: string): boolean {
  if (!key) {
    throw new Error('NID_ENCRYPTION_KEY is not set in environment variables');
  }

  // Check if it's a valid hex string of 64 characters (32 bytes)
  const hexRegex = /^[0-9a-fA-F]{64}$/;
  if (!hexRegex.test(key)) {
    throw new Error(
      'NID_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"'
    );
  }

  return true;
}

/**
 * Encrypts NID number using AES-256-GCM
 * Returns object with ciphertext, IV, and auth tag
 */
export function encryptNID(nid: string, key: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  validateEncryptionKey(key);

  const keyBuffer = Buffer.from(key, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let ciphertext = cipher.update(nid, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts NID number from ciphertext, IV, and auth tag
 */
export function decryptNID(
  ciphertext: string,
  iv: string,
  authTag: string,
  key: string
): string {
  validateEncryptionKey(key);

  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
