const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 254;
}

export function isValidUsername(username: string): boolean {
  const trimmed = username.trim();
  return trimmed.length >= 2 && trimmed.length <= 30;
}

export function isValidStringField(value: string, maxLength: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

const VALID_AVAILABILITY = ['available', 'not_available', 'maybe', 'no_response'] as const;

export function isValidAvailability(value: string): boolean {
  return (VALID_AVAILABILITY as readonly string[]).includes(value);
}
