/**
 * config/roles.js
 * --------------------------------------------------
 * Centralised role configuration for the CycleLink app.
 *
 * Single source of truth for:
 *   - Role definitions
 *   - Default redirect paths per role (after login)
 *   - Role display labels
 *
 * Used by: ProtectedRoute, App router, Navbar, AuthPage
 * --------------------------------------------------
 */

/**
 * Map each role to its default dashboard path.
 * When a user logs in, they are redirected here.
 */
export const ROLE_DASHBOARDS = {
  cyclist: "/dashboard",
  partner: "/partner-dashboard",
  admin: "/admin-panel",
};

/**
 * Human-readable labels for each role.
 */
export const ROLE_LABELS = {
  cyclist: "Cyclist",
  partner: "Partner",
  admin: "Admin",
};

/**
 * Get the dashboard path for a given role.
 * Falls back to /dashboard if role is unknown.
 */
export function getDashboardPath(role) {
  return ROLE_DASHBOARDS[role] || ROLE_DASHBOARDS.cyclist;
}
