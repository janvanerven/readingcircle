import bcrypt from 'bcrypt';
import { PASSWORD_REQUIREMENTS } from '@readingcircle/shared';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): string | null {
  const { minLength, requireUppercase, requireLowercase, requireNumber, requireSpecial } = PASSWORD_REQUIREMENTS;

  if (password.length < minLength) {
    return `Password must be at least ${minLength} characters`;
  }
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must contain at least one special character';
  }
  return null;
}
