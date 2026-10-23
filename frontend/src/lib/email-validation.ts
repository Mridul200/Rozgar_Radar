/**
 * Global Format Validation Utility
 *
 * Implements strict yet RFC-compliant email validation and Indian mobile validation across Rozgar Radar.
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

export const MOBILE_ERROR_MESSAGE =
  "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Validates whether a mobile number is a valid 10-digit Indian phone number.
 * Accepts formats like: '9876543210', '+91 98765 43210', '09876543210'.
 */
export function isValidIndianMobile(mobile: string | null | undefined): boolean {
  if (!mobile) return false;
  let cleaned = mobile.trim().replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return INDIAN_MOBILE_REGEX.test(cleaned);
}

export function normalizeIndianMobile(mobile: string | null | undefined): string {
  if (!mobile) return "";
  let cleaned = mobile.trim().replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}
