/**
 * Global Email Format Validation Utility
 *
 * Implements strict yet RFC-compliant email validation across Rozgar Radar.
 * Rejects invalid patterns like: 'abc', 'abc@', 'abc.com', 'user@domain' (missing TLD).
 * Accepts valid patterns like: 'user@gmail.com', 'student@example.com', 'dev+tag@domain.co.in'.
 */

export const EMAIL_ERROR_MESSAGE = "Please enter a valid email address.";

// Standard RFC 5322 compliant regex requiring a valid domain and at least 2-char TLD
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Validates whether an email string adheres to canonical RFC email format.
 * Trims leading and trailing whitespace automatically.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates email and returns an error message if invalid, or null if valid.
 */
export function getEmailValidationError(email: string | null | undefined): string | null {
  if (!email || !email.trim()) {
    return EMAIL_ERROR_MESSAGE;
  }
  return isValidEmail(email) ? null : EMAIL_ERROR_MESSAGE;
}
