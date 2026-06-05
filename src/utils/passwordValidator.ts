/**
 * Password Security Validator for MCE Connect Platform.
 * Enforces Play Store compliant security rules:
 * - Minimum 6 characters
 * - At least 1 letter (A-Z or a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (@, #, !, $, %, &, *)
 * - No 3 or more consecutive identical characters (e.g. "ppp", "@@@")
 */

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasNoConsecutiveIdentical: boolean;
  errorMessage: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      hasSpecial: false,
      hasNoConsecutiveIdentical: true,
      errorMessage: 'Kripya ek secure password banayein.'
    };
  }

  const hasMinLength = password.length >= 6;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[@#!$%&*]/.test(password);
  
  // Matches any character repeating 3 or more times consecutively
  const hasConsecutiveIdentical = /(.)\1{2,}/.test(password);
  const hasNoConsecutiveIdentical = !hasConsecutiveIdentical;

  let errorMessage = '';
  if (!hasMinLength) {
    errorMessage = 'Password must be at least 6 characters.';
  } else if (!hasLetter) {
    errorMessage = 'Password must contain at least 1 letter.';
  } else if (!hasNumber) {
    errorMessage = 'Password must contain at least 1 number.';
  } else if (!hasSpecial) {
    errorMessage = 'Password must contain at least 1 special character (@ # ! $ % & *).';
  } else if (hasConsecutiveIdentical) {
    errorMessage = 'No repeated characters more than twice consecutively allowed.';
  }

  const isValid = hasMinLength && hasLetter && hasNumber && hasSpecial && hasNoConsecutiveIdentical;

  return {
    isValid,
    hasMinLength,
    hasLetter,
    hasNumber,
    hasSpecial,
    hasNoConsecutiveIdentical,
    errorMessage
  };
}
