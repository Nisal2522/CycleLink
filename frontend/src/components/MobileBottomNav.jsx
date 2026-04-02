/**
 * MobileBottomNav.jsx
 * --------------------------------------------------
 * Fixed bottom navigation bar for mobile devices.
 *
 * Visible only on screens < md (768px).
 * Shows the 4 most important role-specific links
 * plus a "More" sheet with remaining items.
 *
 * Active state matches the sidebar: emerald green icon
 * and label with a subtle background tint.
 * --------------------------------------------------
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
  // Cyclist
  Map,
  Award,
  Trophy,
  CloudSun,
  // Partner
  Store,
  QrCode,
  DollarSign,
  Megaphone,
  // Admin
  Users,
  Activity,
  FileBarChart,
  ScrollText,
  MessageCircle,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { ROLE_LABELS } from "../config/roles";

/* ── Role-specific items (first 4 shown in bar, rest in "More") ── */

const ROLE_NAV = {
  cyclist: [
    { label: "Overview",    to: "/dashboard",              icon: Home },
    { label: "Map",         to: "/dashboard/map",          icon: Map },
    { label: "Rewards",     to: "/dashboard/rewards",      icon: Award },
    { label: "Messages",    to: "/dashboard/messages",     icon: MessageCircle },
    { label: "Board",       to: "/dashboard/leaderboard",  icon: Trophy },
    { label: "Weather",    to: "/dashboard/weather",      icon: CloudSun },
  ],
  partner: [
    { label: "Shop",    to: "/partner-dashboard", icon: Store },
    { label: "Scan QR", to: "/partner-dashboard", icon: QrCode },
    { label: "Earnings", to: "/partner-dashboard", icon: DollarSign },
    { label: "Messages", to: "/partner-dashboard/messages", icon: MessageCircle },
    { label: "Promos",  to: "/partner-dashboard", icon: Megaphone },
  ],
  admin: [
    { label: "Users",    to: "/admin-panel", icon: Users },
    { label: "Heatmaps", to: "/admin-panel", icon: Activity },
    { label: "Messages", to: "/admin-panel/messages", icon: MessageCircle },
    { label: "Reports",  to: "/admin-panel", icon: FileBarChart },
    { label: "Logs",     to: "/admin-panel", icon: ScrollText },
  ],
};

export default function MobileBottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const role = user?.role || "cyclist";
  const roleLabel = ROLE_LABELS[role] || "User";
  const items = ROLE_NAV[role] || ROLE_NAV.cyclist;

  // Show first 3 items + "More" button in the bar
  const barItems = items.slice(0, 3);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* ── Bottom bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-700 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {barItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all"
              >
                <div
                  className={`w-10 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "text-primary" : "text-slate-400"
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    active ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl"
          >
            <div className="w-10 h-8 rounded-lg flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">More</span>
          </button>
        </div>
      </nav>

      {/* ── "More" bottom sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl"
            >
              {/* Handle + close */}
              <div className="flex items-center justify-between px-5 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {user?.name || "User"}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {roleLabel}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-px bg-slate-100 mx-4" />

              {/* All nav items */}
              <div className="px-4 py-3 space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          active ? "text-primary" : "text-slate-400"
                        }`}
                      />
                      {item.label}
                    </Link>
                  );
                })}

                <div className="h-px bg-slate-100 my-2" />

                {/* Shared links */}
                <Link
                  to="/"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Home className="w-5 h-5 text-slate-400" />
                  Home
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Settings className="w-5 h-5 text-slate-400" />
                  Settings
                </Link>

                <div className="h-px bg-slate-100 my-2" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>

              {/* Safe area spacer for iPhones */}
              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
