/**
 * services/authService.js
 * --------------------------------------------------
 * Centralised API service for authentication requests.
 *
 * Error handling strategy:
 *   - Network failures  → friendly "Unable to connect" message
 *   - Timeout (10s)     → "Request timed out" message
 *   - HTTP 4xx/5xx      → server's error message or fallback
 *   - JSON parse errors → generic fallback message
 *
 * All functions throw standard Error objects so the
 * AuthContext can catch them uniformly.
 * --------------------------------------------------
 */

// Use VITE_API_URL in production (e.g. https://your-app.onrender.com/api); relative /api for dev proxy
const BASE = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE ? `${BASE}/auth` : "/api/auth";
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Custom error class for API errors.
 * Carries the HTTP status code alongside the message.
 */
class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Helper — makes a fetch request with timeout and
 * standardised error handling.
 *
 * @param {string} endpoint  — path appended to API_URL
 * @param {object} options   — fetch options (method, headers, body)
 * @returns {Promise<object>} parsed JSON response
 * @throws {ApiError}
 */
async function apiRequest(endpoint, options = {}) {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
    });

    // Attempt to parse JSON (server may return non-JSON on 500s)
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        "Server returned an unexpected response. Please try again.",
        response.status
      );
    }

    // Handle HTTP error statuses
    if (!response.ok) {
      const message = data.message || getDefaultErrorMessage(response.status);
      throw new ApiError(message, response.status);
    }

    // Backend uses responseFormatter: { success, message, data }. Unwrap so callers get the payload.
    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    // Re-throw ApiError as-is
    if (err instanceof ApiError) {
      throw err;
    }

    // Timeout
    if (err.name === "AbortError") {
      throw new ApiError(
        "Request timed out. Please check your connection and try again."
      );
    }

    // Network failure (offline, DNS, CORS, etc.)
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new ApiError(
        "Unable to connect to the server. Please check your internet connection."
      );
    }

    // Unknown error — wrap it
    throw new ApiError(err.message || "An unexpected error occurred.");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Returns a user-friendly message for common HTTP status codes.
 */
function getDefaultErrorMessage(status) {
  const messages = {
    400: "Invalid request. Please check your input.",
    401: "Invalid email or password.",
    403: "Access denied. You don't have permission.",
    404: "The requested resource was not found.",
    409: "This account already exists.",
    422: "Validation failed. Please check your input.",
    429: "Too many requests. Please wait a moment and try again.",
    500: "Server error. Please try again later.",
    502: "Server is temporarily unavailable.",
    503: "Service is under maintenance. Please try again later.",
  };
  return messages[status] || "Something went wrong. Please try again.";
}

/**
 * Helper — makes a POST request with JSON body.
 */
function postJSON(endpoint, body) {
  return apiRequest(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Register a new user account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @param {string} [role="cyclist"] — "cyclist" | "partner" | "admin"
 * @param {string} [shopName] — optional, used when role === "partner"
 * @returns {Promise<{_id, name, email, role, shopName, partnerTotalRedemptions, token}>}
 */
export async function registerUser(
  name,
  email,
  password,
  role = "cyclist",
  shopName
) {
  return postJSON("/register", {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    ...(role === "partner" && shopName ? { shopName } : {}),
  });
}

/**
 * Authenticate an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{_id, name, email, role, shopName, partnerTotalRedemptions, token}>}
 */
export async function loginUser(email, password) {
  return postJSON("/login", {
    email: email.trim().toLowerCase(),
    password,
  });
}

/**
 * Authenticate with Google ID token (from @react-oauth/google).
 * @param {string} credential — Google ID token (credentialResponse.credential)
 * @returns {Promise<{_id, name, email, role, shopName, partnerTotalRedemptions, token}>}
 */
export async function googleLogin(credential) {
  return postJSON("/google", { credential });
}

/**
 * Fetch the profile of the currently logged-in user.
 * @param {string} token
 * @returns {Promise<{_id, name, email, role, shopName, partnerTotalRedemptions, createdAt}>}
 */
export async function getUserProfile(token) {
  return apiRequest("/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Update current user profile (name, profileImage URL).
 * @param {string} token
 * @param {{ name?: string, profileImage?: string }} data
 */
export async function updateProfile(token, data) {
  return apiRequest("/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Upload avatar image (base64 data URI), returns URL.
 * @param {string} token
 * @param {string} image — data:image/...;base64,...
 */
export async function uploadAvatar(token, image) {
  const data = await apiRequest("/upload-avatar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image }),
  });
  return data;
}

/**
 * Change current user's password.
 * @param {string} token
 * @param {{ currentPassword: string, newPassword: string, confirmNewPassword: string }} data
 */
export async function changePassword(token, data) {
  return apiRequest("/change-password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Delete the current user's account (requires password confirmation).
 * @param {string} token
 * @param {string} password
 */
export async function deleteAccount(token, password) {
  return apiRequest("/account", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
}

/**
 * Public stats for login/landing (e.g. total user count).
 * @returns {Promise<{ totalUsers: number }>}
 */
export async function getAuthStats() {
  return apiRequest("/stats", { method: "GET" });
}
