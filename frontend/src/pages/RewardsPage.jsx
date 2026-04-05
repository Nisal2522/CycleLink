/**
 * pages/RewardsPage.jsx
 * --------------------------------------------------
 * Displays the cyclist's Eco-Token rewards fetched
 * from the MongoDB User document via /api/cyclist/stats.
 *
 * Layout (desktop):
 *   Row 1 — Token hero (left 60%) + Safety ring (right 40%)
 *   Row 2 — 4 stat cards (full width)
 *   Row 3 — How tokens work + Redemption placeholder
 *
 * Accessible at: /dashboard/rewards
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  Leaf,
  Route,
  Bike,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
  Gift,
  TrendingUp,
  Sparkles,
  Store,
  ArrowRight,
  Star,
  Zap,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getCyclistStats, getPartnerCount } from "../services/cyclistService";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function RewardsPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shopCount, setShopCount] = useState(0);

  const fetchRewards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getCyclistStats(token);
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rewards.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  // Fetch real partner shop count
  useEffect(() => {
    getPartnerCount()
      .then((res) => setShopCount(res.count))
      .catch(() => setShopCount(0));
  }, []);

  const statCards = [
    {
      label: "CO₂ Saved",
      value: stats ? `${stats.co2Saved.toFixed(1)} kg` : "—",
      sub: "vs driving a car",
      icon: Leaf,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Total Distance",
      value: stats ? `${stats.totalDistance.toFixed(1)} km` : "—",
      sub: "cycled with CycleLink",
      icon: Route,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Total Rides",
      value: stats ? stats.totalRides.toLocaleString() : "—",
      sub: "completed journeys",
      icon: Bike,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/15",
    },
    {
      label: "Safety Score",
      value: stats ? `${stats.safetyScore}%` : "—",
      sub: "safe route adherence",
      icon: Shield,
      color: "text-violet-500",
      bg: "bg-violet-50",
      border: "border-violet-100",
    },
  ];

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Error banner ── */}
        {error && (
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-red-50 border border-red-100 text-xs sm:text-sm text-red-600 mb-3 sm:mb-4"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchRewards}
              className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════
            ROW 1 — Hero: Token Balance + Earning Rate
            ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 mb-4 sm:mb-6">
          {/* Token Balance — spans 3 cols on desktop */}
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 sm:p-7 lg:p-8 text-white shadow-[0_20px_60px_rgba(135,16,83,0.4)]"
          >
            {/* Decorative */}
            <div className="absolute -top-12 -right-12 w-36 sm:w-52 h-36 sm:h-52 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 w-24 sm:w-36 h-24 sm:h-36 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-[15%] w-16 h-16 rounded-full bg-white/5 hidden lg:block" />

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Award className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-white/80 font-semibold">Your Eco-Token Balance</p>
                  <p className="text-[10px] sm:text-xs text-white/50">
                    Hi, {user?.name || "Cyclist"} — keep riding to earn more!
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-3 h-14 sm:h-20">
                  <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
                  <span className="text-white/60 text-sm">Loading your tokens...</span>
                </div>
              ) : (
                <div className="flex items-end gap-2 sm:gap-3">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none">
                    {stats?.tokens?.toLocaleString() || 0}
                  </span>
                  <span className="text-base sm:text-xl text-white/70 mb-1 sm:mb-2 font-medium">tokens</span>
                </div>
              )}

              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-white/70 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Zap className="w-3 h-3" />
                  10 tokens per km
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-white/70 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Leaf className="w-3 h-3" />
                  0.21 kg CO₂ saved per km
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right column — Quick summary cards stacked */}
          <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 lg:gap-5">
            {/* Earning Rate Card */}
            <motion.div
              custom={1}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 flex flex-col justify-center"
            >
              <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-500" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Token Rate</p>
              </div>
              {loading ? (
                <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    {stats?.totalDistance > 0
                      ? (stats.tokens / stats.totalDistance).toFixed(0)
                      : "10"}
                    <span className="text-sm sm:text-base font-medium text-slate-400 ml-1">/ km</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">avg tokens earned per km</p>
                </>
              )}
            </motion.div>

            {/* Partner Shops Card — clickable → Redeem page */}
            <motion.div
              custom={2}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              onClick={() => navigate("/dashboard/redeem")}
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 flex flex-col justify-center cursor-pointer hover:shadow-[0_22px_60px_rgba(135,16,83,0.18)] hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Store className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-500 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700">Redeem At</p>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {shopCount}<span className="text-sm sm:text-base font-medium text-slate-400 ml-1">shops</span>
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">partner locations nearby</p>
            </motion.div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            ROW 2 — Stats Grid (full width, 4 columns)
            ══════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                custom={i + 3}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className={`bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 ${card.border} hover:shadow-[0_22px_60px_rgba(15,23,42,0.32)] transition-shadow`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${card.bg} flex items-center justify-center mb-2.5 sm:mb-3`}>
                  <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${card.color}`} />
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                ) : (
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">{card.value}</p>
                )}
                <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">{card.label}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════
            ROW 3 — How Tokens Work + Recent Rewards
            ══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {/* How Tokens Work — spans 3 cols */}
          <motion.div
            custom={7}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-3 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_20px_60px_rgba(15,23,42,0.32)] border border-slate-100/80"
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-5">How Eco-Tokens Work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: Bike,
                  step: "01",
                  title: "Ride",
                  desc: "Cycle anywhere using CycleLink's safe routes. Your GPS tracks every metre.",
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  icon: TrendingUp,
                  step: "02",
                  title: "Earn",
                  desc: "Get 10 tokens per km plus bonus CO₂ savings added to your profile automatically.",
                  color: "text-emerald-500",
                  bg: "bg-emerald-50",
                },
                {
                  icon: Gift,
                  step: "03",
                  title: "Redeem",
                  desc: "Spend tokens at partner shops for discounts, gear, and sustainable products.",
                  color: "text-amber-500",
                  bg: "bg-amber-50",
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="flex sm:flex-col items-start sm:items-center sm:text-center gap-3 sm:gap-0">
                    <div className="relative shrink-0 sm:mx-auto sm:mb-3">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${step.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${step.color}`} />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-800 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                        {step.step}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-0.5 sm:mb-1">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Rewards / Milestones — spans 2 cols */}
          <motion.div
            custom={8}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.32)] border border-slate-100/80"
          >
            <h2 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Milestones</h2>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  icon: Star,
                  title: "First Ride",
                  desc: "Complete your first tracked ride",
                  done: stats?.totalRides > 0,
                  reward: "+50 bonus tokens",
                },
                {
                  icon: Route,
                  title: "10 km Club",
                  desc: "Cycle a total of 10 kilometres",
                  done: stats?.totalDistance >= 10,
                  reward: "+100 bonus tokens",
                },
                {
                  icon: Leaf,
                  title: "Eco Warrior",
                  desc: "Save 5 kg of CO₂ emissions",
                  done: stats?.co2Saved >= 5,
                  reward: "+200 bonus tokens",
                },
                {
                  icon: Award,
                  title: "Token Master",
                  desc: "Earn 1,000 Eco-Tokens total",
                  done: stats?.tokens >= 1000,
                  reward: "+500 bonus tokens",
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div
                    key={m.title}
                    className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border transition-colors ${
                      m.done
                        ? "bg-emerald-50/50 border-emerald-100"
                        : "bg-slate-50/50 border-slate-100"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                        m.done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-semibold ${m.done ? "text-emerald-800" : "text-slate-700"}`}>
                        {m.title}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400 truncate">{m.desc}</p>
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                        m.done
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {m.done ? "Claimed" : m.reward}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
