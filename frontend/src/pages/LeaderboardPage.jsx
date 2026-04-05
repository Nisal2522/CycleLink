/**
 * pages/LeaderboardPage.jsx
 * --------------------------------------------------
 * Top 5 cyclists sorted by totalDistance from MongoDB.
 *
 * Layout (desktop):
 *   Row 1 — Top 3 podium hero cards
 *   Row 2 — Full table (left 3/5) + Your Rank card + Stats (right 2/5)
 *
 * Accessible at: /dashboard/leaderboard
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Loader2,
  AlertCircle,
  RefreshCw,
  Award,
  Route,
  Leaf,
  Bike,
  Crown,
  Medal,
  TrendingUp,
  Target,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getLeaderboard } from "../services/cyclistService";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Rank badge styles */
const RANK_STYLES = {
  1: { bg: "bg-amber-400", text: "text-white", ring: "ring-amber-200", gradient: "from-amber-400 to-amber-500", label: "1st", icon: Crown },
  2: { bg: "bg-slate-400", text: "text-white", ring: "ring-slate-200", gradient: "from-slate-400 to-slate-500", label: "2nd", icon: Medal },
  3: { bg: "bg-amber-700", text: "text-white", ring: "ring-amber-300", gradient: "from-amber-600 to-amber-700", label: "3rd", icon: Medal },
};
const DEFAULT_RANK = { bg: "bg-slate-100", text: "text-slate-500", ring: "ring-slate-100", gradient: "from-slate-200 to-slate-300", label: "", icon: Trophy };

export default function LeaderboardPage() {
  const { user, token } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeaderboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getLeaderboard(token);
      setLeaders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Find current user in leaderboard
  const myEntry = leaders.find((e) => e._id === user?._id);
  // Top 3 for podium
  const podium = leaders.slice(0, 3);
  // Total community stats
  const totalDistance = leaders.reduce((sum, e) => sum + e.totalDistance, 0);
  const totalCo2 = leaders.reduce((sum, e) => sum + e.co2Saved, 0);
  const totalTokens = leaders.reduce((sum, e) => sum + e.tokens, 0);

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Header ── */}
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between mb-4 sm:mb-6"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Trophy className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Leaderboard</h1>
              <p className="text-xs sm:text-sm text-slate-500">Top 5 cyclists by distance</p>
            </div>
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </motion.div>

        {/* ── Error ── */}
        {error && (
          <motion.div
            custom={1}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-red-50 border border-red-100 text-xs sm:text-sm text-red-600 mb-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchLeaderboard} className="text-red-700 font-semibold text-xs shrink-0">
              Retry
            </button>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-slate-500">Loading leaderboard...</p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            Content (only when loaded)
            ══════════════════════════════════════════ */}
        {!loading && leaders.length > 0 && (
          <>
            {/* ── ROW 1: Podium — Top 3 hero cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {podium.map((entry, i) => {
                const rs = RANK_STYLES[entry.rank] || DEFAULT_RANK;
                const RankIcon = rs.icon;
                const isMe = entry._id === user?._id;

                return (
                  <motion.div
                    key={entry._id}
                    custom={i + 1}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    className={`relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 text-white shadow-lg bg-gradient-to-br ${rs.gradient} ${
                      entry.rank === 1 ? "sm:order-none ring-2 ring-amber-300/50" : ""
                    }`}
                  >
                    {/* Decorative circle */}
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-sm sm:text-lg font-bold backdrop-blur-sm">
                            {entry.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm sm:text-base font-bold truncate max-w-[120px] sm:max-w-[140px]">
                              {entry.name}
                              {isMe && (
                                <span className="ml-1 text-[9px] font-bold uppercase bg-white/25 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] sm:text-xs text-white/70">
                              {entry.totalRides} ride{entry.totalRides !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <RankIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
                          <span className="text-[10px] font-bold text-white/80">{rs.label}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <div className="bg-white/15 rounded-lg p-2 sm:p-2.5 text-center backdrop-blur-sm">
                          <p className="text-xs sm:text-sm font-bold">{entry.totalDistance.toFixed(1)}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/70">km</p>
                        </div>
                        <div className="bg-white/15 rounded-lg p-2 sm:p-2.5 text-center backdrop-blur-sm">
                          <p className="text-xs sm:text-sm font-bold">{entry.co2Saved.toFixed(1)}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/70">CO₂ kg</p>
                        </div>
                        <div className="bg-white/15 rounded-lg p-2 sm:p-2.5 text-center backdrop-blur-sm">
                          <p className="text-xs sm:text-sm font-bold">{entry.tokens.toLocaleString()}</p>
                          <p className="text-[9px] sm:text-[10px] text-white/70">tokens</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ── ROW 2: Full table + sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              {/* Full ranking table — 3/5 */}
              <motion.div
                custom={4}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="lg:col-span-3 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">Full Rankings</h2>
                </div>

                {/* Desktop rows */}
                <div className="hidden sm:block">
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-2 px-6 py-2.5 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">Cyclist</div>
                    <div className="col-span-2 text-right">Distance</div>
                    <div className="col-span-3 text-right">CO₂ Saved</div>
                    <div className="col-span-2 text-right">Tokens</div>
                  </div>
                  {leaders.map((entry) => {
                    const isMe = entry._id === user?._id;
                    const rs = RANK_STYLES[entry.rank] || DEFAULT_RANK;
                    return (
                      <div
                        key={entry._id}
                        className={`grid grid-cols-12 gap-2 px-6 py-3.5 items-center border-b border-slate-50 last:border-b-0 transition-colors ${
                          isMe ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="col-span-1 flex justify-center">
                          <span className={`w-7 h-7 rounded-full ring-2 ${rs.ring} ${rs.bg} ${rs.text} flex items-center justify-center text-xs font-bold`}>
                            {entry.rank}
                          </span>
                        </div>
                        <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {entry.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {entry.name}
                              {isMe && <span className="ml-1.5 text-[10px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>}
                            </p>
                            <p className="text-[11px] text-slate-400">{entry.totalRides} ride{entry.totalRides !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="text-sm font-bold text-slate-800">{entry.totalDistance.toFixed(1)}</span>
                          <span className="text-xs text-slate-400 ml-0.5">km</span>
                        </div>
                        <div className="col-span-3 text-right">
                          <span className="text-sm font-semibold text-emerald-600">{entry.co2Saved.toFixed(1)}</span>
                          <span className="text-xs text-slate-400 ml-0.5">kg</span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600">
                            <Award className="w-3.5 h-3.5" />
                            {entry.tokens.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-slate-50">
                  {leaders.map((entry) => {
                    const isMe = entry._id === user?._id;
                    const rs = RANK_STYLES[entry.rank] || DEFAULT_RANK;
                    return (
                      <div key={entry._id} className={`p-3 ${isMe ? "bg-primary/5" : ""}`}>
                        <div className="flex items-center gap-3 mb-2.5">
                          <span className={`w-7 h-7 rounded-full ring-2 ${rs.ring} ${rs.bg} ${rs.text} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                            {entry.rank}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {entry.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">
                              {entry.name}
                              {isMe && <span className="ml-1 text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>}
                            </p>
                            <p className="text-[10px] text-slate-400">{entry.totalRides} rides</p>
                          </div>
                          <span className="text-sm font-bold text-slate-800 shrink-0">{entry.totalDistance.toFixed(1)} km</span>
                        </div>
                        <div className="flex items-center gap-2 ml-10">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Leaf className="w-2.5 h-2.5" />{entry.co2Saved.toFixed(1)} kg
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Award className="w-2.5 h-2.5" />{entry.tokens.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Right sidebar — 2/5 */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4 lg:space-y-5">
                {/* Your Rank Card */}
                <motion.div
                  custom={5}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100"
                >
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Your Position</h3>
                  {myEntry ? (
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl sm:text-3xl font-extrabold text-primary">#{myEntry.rank}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                        <p className="text-xs text-slate-400">{myEntry.totalDistance.toFixed(1)} km cycled</p>
                        <p className="text-xs text-amber-600 font-semibold mt-0.5">{myEntry.tokens.toLocaleString()} tokens</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                        <Target className="w-7 h-7 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">Not ranked yet</p>
                        <p className="text-xs text-slate-400">Start riding to appear here!</p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Community Stats */}
                <motion.div
                  custom={6}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100"
                >
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-3">Community Totals</h3>
                  <div className="space-y-3">
                    {[
                      { icon: Route, label: "Total Distance", value: `${totalDistance.toFixed(1)} km`, color: "text-blue-500", bg: "bg-blue-50" },
                      { icon: Leaf, label: "CO₂ Saved", value: `${totalCo2.toFixed(1)} kg`, color: "text-emerald-500", bg: "bg-emerald-50" },
                      { icon: Award, label: "Tokens Earned", value: totalTokens.toLocaleString(), color: "text-amber-500", bg: "bg-amber-50" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-400">{item.label}</p>
                            <p className="text-sm sm:text-base font-bold text-slate-800">{item.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Challenge CTA */}
                <motion.div
                  custom={7}
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-4 sm:p-5 text-white shadow-lg shadow-primary/20"
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
                  <div className="relative z-10">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 mb-2 text-white/80" />
                    <h3 className="text-sm sm:text-base font-bold mb-1">Climb the Ranks!</h3>
                    <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed">
                      Every kilometre you cycle moves you up. Open the Live Map, start riding, and earn tokens to reach #1!
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}

        {/* ── Empty state ── */}
        {!loading && leaders.length === 0 && !error && (
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No cyclists on the leaderboard yet.</p>
            <p className="text-sm text-slate-400 mt-1">Start riding to claim the top spot!</p>
          </div>
        )}
      </div>
    </div>
  );
}
