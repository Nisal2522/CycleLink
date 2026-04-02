/**
 * Sidebar.jsx
 * --------------------------------------------------
 * Vertical sticky sidebar with Role-Based Access Control.
 *
 * Layout:
 *   Desktop (md+): Fixed left sidebar, expandable/collapsible
 *   Mobile (<md) : Hidden — mobile uses MobileBottomNav instead
 *
 * Sections (top → bottom):
 *   1. Logo / Brand
 *   2. Role-specific nav links
 *   3. Shared links (Home, Settings)
 *   4. Divider
 *   5. User profile card + Logout
 *
 * Active state:
 *   - Emerald green (#10b981) background tint + 2px left border
 *
 * Collapse behaviour:
 *   - Collapsed: 72px wide, icons only, tooltips on hover
 *   - Expanded: 280px wide, icons + labels
 *   - Smooth Framer Motion width animation
 *
 * Props: none (reads role from useAuth context)
 * --------------------------------------------------
 */

import { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike,
  Home,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  // Cyclist
  Map,
  MapPin,
  Award,
  Clock,
  Trophy,
  CloudSun,
  // Partner
  Store,
  QrCode,
  DollarSign,
  Megaphone,
  // Admin
  ShieldCheck,
  Users,
  Activity,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import useSidebar from "../hooks/useSidebar";
import { ROLE_LABELS, getDashboardPath } from "../config/roles";
import { ROLE_NAV, SHARED_NAV } from "../config/nav";
import { ChatUnreadContext } from "../context/ChatUnreadContext";

/** Shared links: Landing Page first, then Settings */
const SHARED_TOP = SHARED_NAV.filter((item) => item.to === "/");
const SHARED_BOTTOM = SHARED_NAV.filter((item) => item.to === "/settings");

/* ──────────────────────────────────────────────
   Sidebar widths
   ────────────────────────────────────────────── */
const EXPANDED_W = 280; // px
const COLLAPSED_W = 72; // px

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

/** Single navigation link: pill active state, 3px left bar, duotone icon, hover slide. */
function NavItem({ item, isActive, collapsed, badge = 0 }) {
  const Icon = item.icon;

  return (
    <div className="relative group">
      <Link
        to={item.to}
        className={`flex items-center gap-3 px-4 py-3.5 rounded-full text-sm font-medium transition-all duration-200 relative ${
          isActive
            ? "bg-primary-50 dark:bg-primary/15 text-primary dark:text-primary"
            : "text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/80"
        }`}
      >
        {/* Active: 3px vertical bar with rounded corners on the left */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-[3px] bg-primary rounded-r-full"
            aria-hidden
          />
        )}
        <span className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
          <Icon
            strokeWidth={1.5}
            className={`w-[20px] h-[20px] transition-colors duration-200 ${
              isActive
                ? "text-primary fill-primary/20 dark:fill-primary/30"
                : "text-slate-400 fill-slate-300/50 dark:text-slate-500 dark:fill-slate-500/40 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            }`}
          />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Tooltip (collapsed only) */}
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {item.label}
          {badge > 0 && ` (${badge})`}
          {/* Arrow */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-900" />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Sidebar component
   ────────────────────────────────────────────── */

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, toggle, sidebarWidth } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { totalUnread } = useContext(ChatUnreadContext);

  const role = user?.role || "cyclist";
  const roleLinks = ROLE_NAV[role] || ROLE_NAV.cyclist;
  const roleLabel = ROLE_LABELS[role] || "User";
  // Always show signup name as the main user display
  const displayName = user?.name;
  const userInitial = (displayName || user?.name || "U")
    .charAt(0)
    .toUpperCase();

  // Exact match: pathname + search (so admin ?tab= links work). When multiple items share the same to, only the first is active.
  const currentFull = location.pathname + (location.search || "");
  const isActive = (item, index) => {
    if (currentFull !== item.to) return false;
    if (index === undefined) return true;
    const firstWithPath = roleLinks.findIndex((link) => link.to === item.to);
    return index === firstWithPath;
  };

  const handleLogout = () => {
    logout();
    // Clear navigation state to prevent stale 'from' paths
    navigate("/", { replace: true, state: {} });
  };

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.06)] overflow-hidden transition-colors duration-300"
    >
      {/* ── Logo + Collapse toggle ── */}
      <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-700/80">
        <Link to={getDashboardPath(role)} className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden"
              >
                Cycle<span className="text-primary">Link</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={toggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden px-4 py-5">
        {/* Role label — CYCLIST / PARTNER / ADMIN */}
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 mb-3"
            >
              {roleLabel}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Role-specific links */}
        <div className="space-y-2">
          {roleLinks.map((item, index) => (
            <NavItem
              key={item.label}
              item={item}
              isActive={isActive(item, index)}
              collapsed={collapsed}
              badge={item.label === "Messages" ? totalUnread : 0}
            />
          ))}
        </div>

        {/* Separator between role section and GENERAL */}
        <div className="my-5 mx-1 border-t border-slate-200/90 dark:border-slate-700/90" />

        {/* General section label */}
        <AnimatePresence>
          {!collapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-3 mb-3"
            >
              General
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          {SHARED_TOP.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              isActive={isActive(item, undefined)}
              collapsed={collapsed}
            />
          ))}
          {SHARED_BOTTOM.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              isActive={isActive(item, undefined)}
              collapsed={collapsed}
            />
          ))}
          {/* Theme / Dark Mode toggle */}
          <div className={`relative group flex items-center gap-3 px-4 py-3.5 rounded-full transition-all duration-200 hover:bg-gray-50 dark:hover:bg-slate-800/80 ${collapsed ? "justify-center" : ""}`}>
            <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5">
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20" strokeWidth={1.5} />
              ) : (
                <Moon className="w-5 h-5 text-slate-400 fill-slate-300/50 dark:text-slate-500 dark:fill-slate-500/40 group-hover:text-slate-600 dark:group-hover:text-slate-300" strokeWidth={1.5} />
              )}
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-between flex-1 min-w-0"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap overflow-hidden">
                    {isDark ? "Light mode" : "Dark mode"}
                  </span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    role="switch"
                    aria-checked={isDark}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    className="relative w-10 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        isDark ? "left-5" : "left-1"
                      }`}
                    />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {collapsed && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="absolute inset-0"
              />
            )}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {isDark ? "Light mode" : "Dark mode"}
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-900 dark:border-r-slate-700" />
              </div>
            )}
          </div>
        </div>

        {/* Push profile card to bottom */}
        <div className="flex-1" />
      </nav>

      {/* ── User profile + Logout ── */}
      <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-700/80 p-4 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Profile card */}
        <div
          className={`flex items-center gap-3 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 shadow-sm mb-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {/* Avatar */}
          <div className="relative group">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {userInitial}
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-white rounded-full" />

            {/* Tooltip (collapsed only) */}
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {displayName || "User"}
                <span className="block text-[10px] text-slate-400 capitalize">{roleLabel}</span>
                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-900" />
              </div>
            )}
          </div>

          {/* Name + Role (expanded only) */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {displayName || "User"}
                </p>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {roleLabel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="w-[20px] h-[20px] shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Log Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Tooltip (collapsed only) */}
          {collapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Log Out
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-r-[5px] border-r-slate-900" />
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

