/**
 * context/SidebarContext.jsx
 * --------------------------------------------------
 * Tiny context that shares the sidebar collapsed/expanded
 * state between the Sidebar component and the
 * DashboardLayout (which sets the content margin).
 *
 * Provides:
 *   - collapsed : boolean
 *   - toggle    : () → void
 *   - sidebarWidth : number (current width in px)
 * --------------------------------------------------
 */

import { createContext, useState, useCallback, useMemo } from "react";

const EXPANDED_W = 280;
const COLLAPSED_W = 72;

export const SidebarContext = createContext(null);

export default function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);

  const sidebarWidth = collapsed ? COLLAPSED_W : EXPANDED_W;

  const value = useMemo(
    () => ({ collapsed, toggle, sidebarWidth, EXPANDED_W, COLLAPSED_W }),
    [collapsed, toggle, sidebarWidth]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
