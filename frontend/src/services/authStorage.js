/**
 * services/authStorage.js — Read/clear auth from localStorage (same keys as constants/auth.js).
 */
import { TOKEN_KEY, USER_KEY } from "../constants/auth";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}
