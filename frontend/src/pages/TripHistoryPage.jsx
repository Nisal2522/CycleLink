/**
 * pages/TripHistoryPage.jsx
 * --------------------------------------------------
 * Trip history page — summary stats and ride list from API.
 * Accessible at: /dashboard/history
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Route,
  Leaf,
  Award,
  MapPin,
  Calendar,
  Timer,
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getRides } from "../services/cyclistService";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

const PERIODS = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "3months", label: "Last 3 months" },
  { id: "all", label: "All time" },
];

function formatRideDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const rideDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (rideDay.getTime() === today.getTime()) return `Today, ${time}`;
  if (rideDay.getTime() === yesterday.getTime()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined })} ${time}`;
}

export default function TripHistoryPage() {
  const { user, token } = useAuth();
  const [period, setPeriod] = useState("week");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState({ summary: null, rides: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getRides(token, { period, search: search || undefined })
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || "Failed to load rides"))
      .finally(() => setLoading(false));
  }, [token, period, search]);

  const applySearch = () => setSearch(searchInput);
  const summary = data.summary;
  const rides = data.rides || [];

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Header ── */}
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Trip History</h1>
                <p className="text-xs sm:text-sm text-slate-500">Your past rides and route logs</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════
            ROW 1 — Summary Stats (from API)
            ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {loading && !summary ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/95 rounded-2xl p-4 sm:p-5 lg:p-6 border border-slate-100/80 animate-pulse h-24" />
            ))
          ) : error ? (
            <div className="sm:col-span-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
          ) : (
            [
              {
                label: period === "week" ? "This Week" : period === "month" ? "This Month" : period === "3months" ? "Last 3 Months" : "All Time",
                value: summary ? `${summary.totalDistance} km` : "0 km",
                sub: summary ? `${summary.totalRides} rides completed` : "0 rides",
                icon: Route,
                color: "text-blue-500",
                bg: "bg-blue-50",
                border: "border-blue-100",
              },
              {
                label: "Tokens Earned",
                value: summary ? String(summary.totalTokens) : "0",
                sub: period === "week" ? "this week" : period === "month" ? "this month" : "",
                icon: Award,
                color: "text-amber-500",
                bg: "bg-amber-50",
                border: "border-amber-100",
              },
              {
                label: "CO₂ Saved",
                value: summary ? `${summary.totalCo2} kg` : "0 kg",
                sub: period === "week" ? "this week" : period === "month" ? "this month" : "",
                icon: Leaf,
                color: "text-emerald-500",
                bg: "bg-emerald-50",
                border: "border-emerald-100",
              },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  custom={i + 1}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className={`bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 ${stat.border} hover:shadow-[0_22px_60px_rgba(15,23,42,0.32)] transition-shadow`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs sm:text-sm font-medium text-slate-600">{stat.label}</p>
                      <p className="text-[10px] sm:text-xs text-slate-400">{stat.sub}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ══════════════════════════════════════════
            ROW 2 — Trip List + Filters sidebar
            ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {/* Trip list — 3/5 */}
          <motion.div
            custom={4}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-3 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.32)] border border-slate-100/80 overflow-hidden"
          >
            {/* List header */}
            <div className="flex items-center justify-between p-3 sm:p-5 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Recent Rides</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                  <ArrowUpDown className="w-3 h-3" />
                  <span className="hidden sm:inline">Sort</span>
                </button>
                <button className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                  <Filter className="w-3 h-3" />
                  <span className="hidden sm:inline">Filter</span>
                </button>
              </div>
            </div>

            {/* Trip cards */}
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : rides.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No rides in this period. Complete rides on the map to see them here.
                </div>
              ) : (
                rides.map((trip, i) => (
                  <motion.div
                    key={trip._id}
                    custom={i + 5}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    className="relative p-3 sm:p-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                        <MapPin className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {trip.startLocation && trip.startLocation !== "—" ? trip.startLocation : "Start"}
                          </p>
                          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {trip.endLocation && trip.endLocation !== "—" ? trip.endLocation : "End"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {formatRideDate(trip.createdAt)}
                          </span>
                          {trip.durationText && (
                            <span className="flex items-center gap-0.5">
                              <Timer className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              {trip.durationText}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                          {trip.distance} km
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full">
                            <Award className="w-2.5 h-2.5" />
                            +{trip.tokensEarned}
                          </span>
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Leaf className="w-2.5 h-2.5" />
                            {trip.co2Saved} kg
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Right column — Filters + Summary */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-5">
            {/* Search */}
            <motion.div
              custom={5}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Search Rides</h3>
              <div className="relative flex gap-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by location..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={applySearch}
                  className="shrink-0 px-3 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </motion.div>

            {/* Filter options */}
            <motion.div
              custom={6}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Filters</h3>
              <div className="space-y-2.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                      period === p.id
                        ? "bg-primary/8 text-primary border border-primary/15"
                        : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Ride stats breakdown */}
            <motion.div
              custom={7}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Ride Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Morning rides", pct: 60, color: "bg-primary" },
                  { label: "Evening rides", pct: 30, color: "bg-amber-400" },
                  { label: "Weekend rides", pct: 10, color: "bg-emerald-400" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] sm:text-xs font-medium text-slate-600">{item.label}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-800">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
