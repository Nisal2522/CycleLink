/**
 * utils/errorHandler.js
 * --------------------------------------------------
 * Global error handling for auth (Clean Architecture).
 * On 401: clear invalid token and notify app to redirect to login with "Session expired".
 * --------------------------------------------------
 */

import { TOKEN_KEY, USER_KEY, AUTH_LOGOUT_EVENT } from "../constants/auth";

/**
 * Clear stored auth and dispatch event so the app can redirect to login.
 * Call this from the response interceptor on 401.
 * @param {string} [message="Session expired"] — message to show on login page
 */
export function handleUnauthorized(message = "Session expired") {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { message } })
  );
}

/**
 * Check if an error is a 401 Unauthorized response.
 * @param {*} err — axios error or similar
 */
export function isUnauthorized(err) {
  return err?.response?.status === 401;
}
