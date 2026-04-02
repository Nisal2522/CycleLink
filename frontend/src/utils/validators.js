/**
 * utils/validators.js
 * --------------------------------------------------
 * Pure validation functions for form fields.
 *
 * Each validator returns either:
 *   - "" (empty string)  → field is valid
 *   - "Error message"    → field is invalid
 *
 * This keeps validation logic reusable, testable,
 * and completely separated from UI components.
 * --------------------------------------------------
 */

/**
 * Validate a user's full name.
 * Rules: required, 2–50 characters, letters/spaces only.
 */
export function validateName(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "Full name is required";
  }
  if (trimmed.length < 2) {
    return "Name must be at least 2 characters";
  }
  if (trimmed.length > 50) {
    return "Name must be under 50 characters";
  }
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes";
  }
  return "";
}

/**
 * Validate an email address.
 * Uses a practical regex — not RFC 5322 strict,
 * but catches 99% of invalid input.
 */
export function validateEmail(email) {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Email address is required";
  }
  if (trimmed.length > 254) {
    return "Email is too long";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return "";
}

/**
 * Validate a password.
 * Rules: required, 8–128 chars, at least one uppercase,
 * one lowercase, and one number.
 */
export function validatePassword(password) {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (password.length > 128) {
    return "Password must be under 128 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return "";
}

/**
 * Validate all sign-up fields at once.
 * @returns {{ name: string, email: string, password: string }}
 *   Object of error messages (empty strings if valid)
 */
export function validateSignUpForm({ name, email, password }) {
  return {
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
  };
}

/**
 * Validate sign-in fields.
 * @returns {{ email: string, password: string }}
 */
export function validateSignInForm({ email, password }) {
  return {
    email: validateEmail(email),
    password: password ? "" : "Password is required",
  };
}

/**
 * Check if an errors object has any active errors.
 * @param {Object} errors — e.g. { name: "", email: "Invalid" }
 * @returns {boolean} true if at least one field has an error
 */
export function hasErrors(errors) {
  return Object.values(errors).some((msg) => msg !== "");
}
