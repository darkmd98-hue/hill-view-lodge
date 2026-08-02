// ── Shared Input Validation Utilities ──
// Used by API routes to validate user input server-side.

// ── Configurable Limits ──
export const VALIDATION_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PHONE_DIGITS: 10,
  PINCODE_DIGITS: 6,
  MAX_PRICE: 1_000_000,       // ₹10 lakh ceiling
  MAX_ROOM_UNITS: 999,
  MAX_INITIAL_UNITS: 100,
} as const;

/**
 * Validates an Indian phone number (10 digits, optionally prefixed with +91 or 0).
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Accept +91XXXXXXXXXX, 0XXXXXXXXXX, or just XXXXXXXXXX
  return /^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned);
}

/**
 * Validates a basic email format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Validates a date string in YYYY-MM-DD format and optionally checks it's not in the past.
 */
export function isValidDate(dateStr: string, options?: { allowPast?: boolean }): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return false;

  if (!options?.allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
  }

  return true;
}

/**
 * Validates a UUID v4 format string.
 */
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Validates an Indian postal pincode (6 digits).
 */
export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Validates a string field for length bounds.
 */
export function isValidString(
  value: unknown,
  minLen = 1,
  maxLen = 500
): value is string {
  return typeof value === 'string' && value.trim().length >= minLen && value.trim().length <= maxLen;
}

/**
 * Validates a positive number within a range.
 */
export function isValidPositiveNumber(
  value: unknown,
  max = VALIDATION_LIMITS.MAX_PRICE
): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0 && num <= max && isFinite(num);
}

/**
 * Validates a non-negative integer within a range.
 */
export function isValidNonNegativeInt(
  value: unknown,
  max = VALIDATION_LIMITS.MAX_ROOM_UNITS
): boolean {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0 && num <= max;
}
