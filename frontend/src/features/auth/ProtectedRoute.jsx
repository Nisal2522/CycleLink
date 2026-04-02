/**
 * features/auth/ProtectedRoute.jsx
 * --------------------------------------------------
 * Role-Based Access Control (RBAC) — Requirement iv.
 *
 * - Checks valid JWT (in localStorage) and user role from AuthContext.
 * - Redirects to /login if not authenticated.
 * - Redirects to /unauthorized if role is not in allowedRoles.
 *
 * Clean Architecture: auth feature owns route protection logic.
 *
 * FIX (2026-02-21): Use AuthContext as source of truth to prevent
 * stale localStorage data after logout/login with different account.
 * --------------------------------------------------
 */

import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const { user, token } = useAuth();

  // ✅ Use AuthContext as single source of truth (always fresh)
  // AuthContext syncs with localStorage but provides reactive updates
  const isAuthenticated = !!(token && user);

  // Not authenticated → redirect to login, preserve attempted URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normalise role to lowercase so "Partner" / "partner" both work
  const rawRole = user?.role;
  const role = (rawRole && String(rawRole).toLowerCase()) || "cyclist";

  // Validate role is one of the known roles
  const validRole = ["cyclist", "partner", "admin"].includes(role) ? role : "cyclist";

  // Authenticated but role not allowed → show Unauthorized (RBAC)
  if (allowedRoles.length > 0 && !allowedRoles.includes(validRole)) {
    return <Navigate to="/unauthorized" state={{ from: location, role: validRole }} replace />;
  }

  return children;
}
