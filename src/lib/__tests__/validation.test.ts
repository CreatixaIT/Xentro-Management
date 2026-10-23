import { describe, it, expect } from 'vitest';
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
} from '../validation';

describe('Validation Schemas', () => {
  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      expect(() => usernameSchema.parse('john_doe')).not.toThrow();
      expect(() => usernameSchema.parse('alice.bob')).not.toThrow();
      expect(() => usernameSchema.parse('test-user123')).not.toThrow();
    });

    it('should reject invalid usernames', () => {
      expect(() => usernameSchema.parse('ab')).toThrow();
      expect(() => usernameSchema.parse('a'.repeat(25))).toThrow();
      expect(() => usernameSchema.parse('JohnDoe')).toThrow();
      expect(() => usernameSchema.parse('user@name')).toThrow();
    });
  });

  describe('fullNameSchema', () => {
    it('should accept valid full names', () => {
      expect(() => fullNameSchema.parse('John Doe')).not.toThrow();
      expect(() => fullNameSchema.parse('Jane Marie Smith')).not.toThrow();
    });

    it('should reject invalid full names', () => {
      expect(() => fullNameSchema.parse('')).toThrow();
      expect(() => fullNameSchema.parse('J')).toThrow();
    });
  });

  describe('ageSchema', () => {
    it('should accept valid ages', () => {
      expect(() => ageSchema.parse(18)).not.toThrow();
      expect(() => ageSchema.parse(25)).not.toThrow();
      expect(() => ageSchema.parse(65)).not.toThrow();
    });

    it('should reject invalid ages', () => {
      expect(() => ageSchema.parse(0)).toThrow();
      expect(() => ageSchema.parse(121)).toThrow();
      expect(() => ageSchema.parse(-5)).toThrow();
    });
  });

  describe('nidSchema', () => {
    it('should accept valid NID format', () => {
      expect(() => nidSchema.parse('1234567890123')).not.toThrow();
      expect(() => nidSchema.parse('1234567890123456')).not.toThrow();
    });

    it('should reject invalid NID format', () => {
      expect(() => nidSchema.parse('123')).toThrow();
      expect(() => nidSchema.parse('abcdefghijkl')).toThrow();
    });
  });

  describe('phoneSchema', () => {
    it('should accept valid phone numbers', () => {
      expect(() => phoneSchema.parse('+88012345678901')).not.toThrow();
      expect(() => phoneSchema.parse('01712345678901')).not.toThrow();
    });

    it('should reject invalid phone numbers', () => {
      expect(() => phoneSchema.parse('123')).toThrow();
      expect(() => phoneSchema.parse('abc')).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(() => emailSchema.parse('user@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@example.com')).not.toThrow();
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
    });
  });

  describe('passwordOrPasscodeSchema', () => {
    it('should accept valid passwords', () => {
      expect(() => passwordOrPasscodeSchema.parse('Password1')).not.toThrow();
      expect(() => passwordOrPasscodeSchema.parse('Test123')).not.toThrow();
    });

    it('should accept valid 6-digit passcodes', () => {
      expect(() => passwordOrPasscodeSchema.parse('123456')).not.toThrow();
      expect(() => passwordOrPasscodeSchema.parse('000000')).not.toThrow();
    });

    it('should reject invalid passwords', () => {
      expect(() => passwordOrPasscodeSchema.parse('password')).toThrow();
      expect(() => passwordOrPasscodeSchema.parse('Password')).toThrow();
      expect(() => passwordOrPasscodeSchema.parse('12345')).toThrow();
    });
  });
});
