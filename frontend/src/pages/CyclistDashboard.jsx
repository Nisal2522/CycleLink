/**
 * pages/CyclistDashboard.jsx
 * --------------------------------------------------
 * Cyclist dashboard overview connected to the Node.js API.
 *
 * Responsive:
 *   Mobile  — 2-col stats, stacked quick-links, shorter map
 *   Tablet  — 3-col stats, 3-col quick-links
 *   Desktop — 5-col stats, full map
 *
 * Accessible at: /dashboard (index)
 * Protected: requires role "cyclist"
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bike,
  Leaf,
  Award,
  Route,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Trophy,
  ArrowRight,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getCyclistStats } from "../services/cyclistService";
import LiveMap from "../components/LiveMap";
import WeatherWidget from "../components/WeatherWidget";

/* ── Animation ── */
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ── Stat card config (design matches Partner dashboard: top bar + icon in white box) ── */
const STAT_CONFIG = [
  { key: "totalRides",   label: "Total Rides",  icon: Bike,   barColor: "#a91d5c",   format: (v) => v.toLocaleString() },
  { key: "co2Saved",     label: "CO₂ Saved",    icon: Leaf,   barColor: "#10b981",   format: (v) => `${v.toFixed(1)} kg` },
  { key: "tokens",       label: "Eco-Tokens",   icon: Award,  barColor: "#f59e0b",   format: (v) => v.toLocaleString() },
  { key: "totalDistance", label: "Distance",     icon: Route,  barColor: "#3b82f6",   format: (v) => `${v.toFixed(1)} km` },
  { key: "safetyScore",  label: "Safety Score",  icon: Shield, barColor: "#8b5cf6",   format: (v) => `${v}%` },
];

/* ── Quick action links ── */
const QUICK_LINKS = [
  {
    to: "/dashboard/map",
    label: "Open Live Map",
    desc: "Report hazards & plan routes",
    icon: MapPin,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    to: "/dashboard/rewards",
    label: "My Rewards",
    desc: "View your Eco-Token balance",
    icon: Award,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    to: "/dashboard/leaderboard",
    label: "Leaderboard",
    desc: "See the top 5 cyclists",
    icon: Trophy,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
];

export default function CyclistDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await getCyclistStats(token);
      setStats(data);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "";
      if (status === 401 && (message.includes("invalid token") || message.includes("expired") || message.includes("Not authorized"))) {
        logout();
        navigate("/login", { replace: true, state: { message: "Session expired or invalid. Please sign in again." } });
        return;
      }
      setStatsError(message || "Failed to load stats. Is the backend running?");
    } finally {
      setStatsLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRideUpdate = (data) => {
    if (data?.totals) {
      setStats((prev) => (prev ? { ...prev, ...data.totals } : prev));
    }
  };

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Header + Weather ── */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Left: greeting */}
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="shrink-0"
          >
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white transition-colors duration-300">
              Welcome back,{" "}
              <span className="text-primary">{user?.name || "Cyclist"}</span>
            </h1>
            <p className="mt-0.5 sm:mt-1 text-slate-500 dark:text-slate-400 text-xs sm:text-sm lg:text-base">
              Your live cycling dashboard. Ride safe, earn green rewards!
            </p>
          </motion.div>

          {/* Right: weather widget */}
          <motion.div
            custom={1}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="w-full lg:w-auto lg:min-w-[340px] lg:max-w-[420px]"
          >
            <WeatherWidget />
          </motion.div>
        </div>

        {/* ── Error banner ── */}
        {statsError && (
          <motion.div
            custom={1}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-xs sm:text-sm text-red-600 dark:text-red-400 mb-3 sm:mb-4 transition-colors duration-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 line-clamp-2">{statsError}</span>
            <button
              onClick={fetchStats}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}

        {/* ── Stats Grid (same design as Partner dashboard: top bar + icon in white rounded box) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          {STAT_CONFIG.map((cfg, i) => {
            const Icon = cfg.icon;
            const value = stats ? cfg.format(stats[cfg.key] || 0) : "—";

            return (
              <motion.div
                key={cfg.key}
                custom={i + 1}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.12)] dark:shadow-none border dark:border-slate-700 hover:shadow-[0_26px_70px_rgba(15,23,42,0.18)] dark:hover:border-slate-600 transition-colors duration-300 min-w-0"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: cfg.barColor }} />
                <div className="p-4 sm:p-5">
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                    style={{
                      backgroundColor: "#ffffff",
                      color: cfg.barColor,
                      boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
                    }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {statsLoading ? (
                    <div className="flex items-center gap-2 h-8 sm:h-9 mt-4">
                      <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                    </div>
                  ) : (
                    <p
                      className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight truncate"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                      title={value}
                    >
                      {value}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={cfg.label}>
                    {cfg.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          {QUICK_LINKS.map((link, i) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.to}
                custom={i + 6}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
              >
                <Link
                  to={link.to}
                  className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl p-3 sm:p-4 lg:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] dark:shadow-none border dark:border-slate-700 hover:shadow-[0_22px_60px_rgba(15,23,42,0.32)] dark:hover:border-slate-600 hover:border-primary/20 transition-colors duration-300 group"
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl ${link.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${link.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                      {link.label}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">{link.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ── Compact Live Map ── */}
        <motion.div
          custom={9}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(15,23,42,0.32)] dark:shadow-none border dark:border-slate-700 overflow-hidden transition-colors duration-300">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white transition-colors duration-300">Live Map</h2>
              <Link
                to="/dashboard/map"
                className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Full Screen
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Link>
            </div>
            <div className="h-[260px] sm:h-[350px] lg:h-[400px] rounded-xl sm:rounded-2xl overflow-hidden border dark:border-slate-700 transition-colors duration-300">
              <LiveMap token={token} userId={user?._id} onRideUpdate={handleRideUpdate} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
