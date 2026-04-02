/**
 * services/interceptors.js
 * --------------------------------------------------
 * Axios interceptors (Clean Architecture).
 * - Request: attach Authorization from localStorage on every request (dynamic read).
 * - Response: on 401, call global error handler to clear token and trigger redirect.
 * --------------------------------------------------
 */

import { TOKEN_KEY } from "../constants/auth";
import { handleUnauthorized, isUnauthorized } from "../utils/errorHandler";

/**
 * Get token from localStorage for this request (always fresh).
 */
function getTokenForRequest() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return typeof token === "string" && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Attach request interceptor: add Bearer token from localStorage if not already set.
 */
export function attachAuthRequestInterceptor(axiosInstance) {
  axiosInstance.interceptors.request.use(
    (config) => {
      const existing =
        config.headers?.Authorization ?? config.headers?.authorization;
      if (existing) return config;
      const token = getTokenForRequest();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (err) => Promise.reject(err)
  );
}

/**
 * Attach response interceptor: on 401, clear auth and dispatch "Session expired" redirect.
 */
export function attach401ResponseInterceptor(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (err) => {
      if (isUnauthorized(err)) {
        handleUnauthorized("Session expired");
      }
      return Promise.reject(err);
    }
  );
}

/**
 * Attach both auth request and 401 response interceptors.
 */
export function attachAuthInterceptors(axiosInstance) {
  attachAuthRequestInterceptor(axiosInstance);
  attach401ResponseInterceptor(axiosInstance);
}
