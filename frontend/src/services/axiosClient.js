/**
 * services/axiosClient.js
 * --------------------------------------------------
 * Central Axios instance. Auth is attached via interceptors.js (token from localStorage per request).
 * 401 handling and redirect are in utils/errorHandler.js.
 * --------------------------------------------------
 */

import axios from "axios";
import { attachAuthInterceptors } from "./interceptors";

const baseURL = import.meta.env.VITE_API_URL ?? "";

export const axiosClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

attachAuthInterceptors(axiosClient);

// Re-export for callers that need token or clear (e.g. AuthContext sync)
export { getStoredToken, clearStoredAuth } from "./authStorage";

export default axiosClient;
