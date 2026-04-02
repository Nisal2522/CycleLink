/**
 * context/AuthContext.jsx
 * --------------------------------------------------
 * Global authentication state using React Context API.
 *
 * Provides:
 *   - user        : { _id, name, email, role } | null
 *   - token       : string | null — JWT token
 *   - loading     : boolean       — true during auth requests
 *   - error       : string        — latest error message
 *   - register    : async (name, email, password, role?) → boolean
 *   - login       : async (email, password) → boolean
 *   - logout      : () → void
 *   - clearError  : () → void
 *
 * Roles: "cyclist" | "partner" | "admin"
 *
 * On mount, checks localStorage for an existing session
 * so the user stays logged in across page refreshes.
 *
 * Usage:
 *   Wrap <App /> with <AuthProvider> in main.jsx
 *   Access state via the useAuth() custom hook
 * --------------------------------------------------
 */

import { createContext, useState, useEffect, useCallback } from "react";
import { registerUser, loginUser, googleLogin as googleLoginApi, updateProfile as updateProfileApi, uploadAvatar as uploadAvatarApi } from "../services/authService";
import { TOKEN_KEY, USER_KEY, AUTH_LOGOUT_EVENT } from "../constants/auth";

// Create context
export const AuthContext = createContext(null);

/** Hydrate auth state from localStorage synchronously so user stays logged in on refresh */
function getInitialToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getInitialUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(getInitialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync state when 401 handler clears auth (interceptor / errorHandler)
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
  }, []);

  /**
   * Save auth data to state and localStorage.
   * Includes role + partner metadata when present.
   */
  const saveSession = useCallback((data) => {
    const tokenValue = data?.token;
    if (!tokenValue || typeof tokenValue !== "string") return;

    const role = (data.role && String(data.role).toLowerCase()) || "cyclist";
    const userData = {
      _id: data._id,
      name: data.name,
      email: data.email,
      role: ["cyclist", "partner", "admin"].includes(role) ? role : "cyclist",
      shopName: data.shopName ?? null,
      shopImage: data.shopImage ?? data.shopImageUrl ?? "",
      profileImage: data.profileImage ?? "",
      partnerTotalRedemptions: data.partnerTotalRedemptions || 0,
    };

    setToken(tokenValue);
    setUser(userData);
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  /**
   * Register a new user.
   * @param {string} name
   * @param {string} email
   * @param {string} password
   * @param {string} [role="cyclist"]
   * @returns {boolean} true on success, false on failure
   */
  const register = useCallback(
    async (name, email, password, role = "cyclist", shopName) => {
      setLoading(true);
      setError("");

      try {
        const data = await registerUser(name, email, password, role, shopName);
        saveSession(data);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [saveSession]
  );

  /**
   * Log in an existing user.
   * @returns {boolean} true on success, false on failure
   */
  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError("");

      try {
        const data = await loginUser(email, password);
        saveSession(data);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [saveSession]
  );

  /**
   * Log in with Google credential (ID token from @react-oauth/google).
   * @param {string} credential
   * @returns {Promise<boolean>} true on success, false on failure
   */
  const loginWithGoogle = useCallback(
    async (credential) => {
      setLoading(true);
      setError("");

      try {
        const data = await googleLoginApi(credential);
        saveSession(data);
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [saveSession]
  );

  /**
   * Log out — clears state and localStorage.
   * FIX (2026-02-21): Clear all auth state to prevent stale data.
   */
  const logout = useCallback(() => {
    // Clear React state
    setUser(null);
    setToken(null);
    setError("");
    setLoading(false);

    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Clear any session storage as well (defensive)
    try {
      sessionStorage.clear();
    } catch {
      // Ignore errors
    }
  }, []);

  /**
   * Clear the current error message.
   */
  const clearError = useCallback(() => setError(""), []);

  /**
   * Update user in state and localStorage (e.g. after shop profile edit or avatar upload).
   */
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /**
   * Upload profile image and update user in state.
   * @param {string} base64DataUri — data:image/...;base64,...
   */
  const uploadProfileImage = useCallback(
    async (base64DataUri) => {
      if (!token) return null;
      const data = await uploadAvatarApi(token, base64DataUri);
      const url = data?.url || data?.profileImage;
      if (url) {
        updateUser({ profileImage: url });
        return url;
      }
      return null;
    },
    [token, updateUser]
  );

  // Context value
  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    loginWithGoogle,
    logout,
    clearError,
    updateUser,
    updateProfile: updateProfileApi,
    uploadProfileImage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
