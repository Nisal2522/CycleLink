/**
 * hooks/useAuth.js
 * --------------------------------------------------
 * Custom React hook for accessing the AuthContext.
 *
 * Usage:
 *   const { user, login, logout, register } = useAuth();
 *
 * Throws an error if used outside of <AuthProvider>,
 * making bugs easy to catch during development.
 * --------------------------------------------------
 */

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth() must be used within an <AuthProvider>. " +
        "Wrap your <App /> component with <AuthProvider> in main.jsx."
    );
  }

  return context;
}
