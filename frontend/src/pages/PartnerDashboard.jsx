/**
 * pages/PartnerDashboard.jsx
 * --------------------------------------------------
 * Dashboard for the "partner" role (business owners).
 *
 * Responsive:
 *   Mobile  — 2-col stats, stacked QR + redemptions
 *   Desktop — 4-col stats, side-by-side sections
 *
 * Accessible at: /partner-dashboard
 * Protected: requires role "partner"
 * --------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Store,
  Users,
  Coins,
  Clock,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Sparkles,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import {
  getPartnerRewards,
  createReward,
  updateReward,
  deleteReward,
  getPartnerRecentRedemptions,
} from "../services/partnerService";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

function timeAgo(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? "s" : ""} ago`;
  return d.toLocaleDateString();
}

export default function PartnerDashboard() {
  const { user, token } = useAuth();

  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [savingReward, setSavingReward] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    tokenCost: "",
    expiryDate: "",
  });
  const [formError, setFormError] = useState("");

  const [recentRedemptions, setRecentRedemptions] = useState([]);
  const [loadingRecentRedemptions, setLoadingRecentRedemptions] = useState(true);

  // For greeting, show the partner's account name from signup
  const partnerDisplayName = useMemo(
    () => user?.name || "Partner",
    [user?.name]
  );

  const totalRedemptions = user?.partnerTotalRedemptions || 0;
  const rewardsList = Array.isArray(rewards) ? rewards : [];
  const activeRewards = rewardsList.filter((r) => r.active).length;

  const STATS = useMemo(
    () => [
      {
        icon: Coins,
        label: "Total Redemptions",
        value: totalRedemptions.toLocaleString(),
        barColor: "#f59e0b",
      },
      {
        icon: Store,
        label: "Active Rewards",
        value: activeRewards.toString(),
        barColor: "#871053",
      },
      {
        icon: Users,
        label: "Recent Cyclists",
        value: "Live",
        barColor: "#0ea5e9",
      },
      {
        icon: Clock,
        label: "Last Updated",
        value: "Just now",
        barColor: "#8b5cf6",
      },
    ],
    [activeRewards, totalRedemptions]
  );

  // Fetch rewards for this partner
  useEffect(() => {
    if (!token || !user?._id) return;
    let cancelled = false;
    setLoadingRewards(true);
    getPartnerRewards(token, user._id)
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : (data?.data ?? []);
          setRewards(list);
        }
      })
      .catch(() => {
        if (!cancelled) setRewards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRewards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, user?._id]);

  const fetchRecentRedemptions = () => {
    if (!token) return;
    setLoadingRecentRedemptions(true);
    getPartnerRecentRedemptions(token, { limit: 5 })
      .then((data) => setRecentRedemptions(data?.redemptions ?? []))
      .catch(() => setRecentRedemptions([]))
      .finally(() => setLoadingRecentRedemptions(false));
  };

  useEffect(() => {
    fetchRecentRedemptions();
  }, [token]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && token) fetchRecentRedemptions();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [token]);

  const resetForm = () => {
    setEditingReward(null);
    setFormValues({
      title: "",
      description: "",
      tokenCost: "",
      expiryDate: "",
    });
    setFormError("");
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setFormValues({
      title: reward.title,
      description: reward.description || "",
      tokenCost: reward.tokenCost.toString(),
      expiryDate: reward.expiryDate
        ? reward.expiryDate.substring(0, 10)
        : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitReward = async (e) => {
    e.preventDefault();
    if (!token) return;

    const tokenCostNum = Number(formValues.tokenCost);
    if (!formValues.title.trim() || !tokenCostNum || tokenCostNum <= 0) {
      setFormError("Title and a positive token cost are required.");
      return;
    }

    setSavingReward(true);
    setFormError("");
    try {
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description.trim() || undefined,
        tokenCost: tokenCostNum,
        expiryDate: formValues.expiryDate || undefined,
      };

      if (editingReward) {
        const updated = await updateReward(token, editingReward._id, payload);
        setRewards((prev) =>
          (Array.isArray(prev) ? prev : []).map((r) => (r._id === updated._id ? updated : r))
        );
      } else {
        const created = await createReward(token, payload);
        setRewards((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      }
      resetForm();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save reward.");
    } finally {
      setSavingReward(false);
    }
  };

  const handleDeleteReward = async (rewardId) => {
    if (!token) return;
    try {
      await deleteReward(token, rewardId);
      setRewards((prev) => (Array.isArray(prev) ? prev : []).filter((r) => r._id !== rewardId));
    } catch {
      // ignore for now; you could surface a toast here
    }
  };

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-6 sm:pb-8">
        {/* Header — aligned to left, matching main dashboard greeting style */}
        <motion.div
          custom={0}
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="mb-4 sm:mb-6"
        >
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white">
            Welcome back,{" "}
            <span className="text-primary">{partnerDisplayName}</span>
          </h1>
          <p className="mt-0.5 sm:mt-1 text-slate-500 dark:text-slate-400 text-xs sm:text-sm lg:text-base">
            Your shop dashboard. Manage redemptions, earn green rewards!
          </p>
        </motion.div>

        {/* Stats Grid — same style as admin overview (attachment 1): top bar, white icon circle, value, label */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
          {STATS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                custom={i + 1}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.12)] dark:shadow-none border dark:border-slate-700 hover:shadow-[0_26px_70px_rgba(15,23,42,0.18)] dark:hover:border-slate-600 transition-all duration-300 min-w-0"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: stat.barColor }} />
                <div className="p-4 sm:p-5">
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                    style={{
                      backgroundColor: "#ffffff",
                      color: stat.barColor,
                      boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
                    }}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <p
                    className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight truncate"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    title={stat.value}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={stat.label}>
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Layout: stacked on mobile, 2 cols on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Reward Manager + Redemption Tool — redesigned */}
          <motion.div
            custom={5}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.32)] dark:shadow-none border dark:border-slate-700 overflow-hidden flex flex-col gap-0 min-w-0"
          >
            {/* ── Reward Manager: header with accent ── */}
            <div className="bg-gradient-to-br from-primary/8 via-white to-amber-50/50 border-b border-slate-100 px-5 sm:px-6 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner border border-primary/10">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                      Reward Manager
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Create and manage token-based discounts for cyclists
                    </p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  {activeRewards} active
                </span>
              </div>
            </div>

            {/* ── Create reward form ── */}
            <form
              id="reward-form"
              onSubmit={handleSubmitReward}
              className="px-5 sm:px-6 py-4 sm:py-5 bg-slate-50/70 border-b border-slate-100"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reward title</label>
                  <input
                    type="text"
                    value={formValues.title}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, title: e.target.value }))
                    }
                    placeholder="e.g. 10% Off Coffee"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tokens</label>
                  <input
                    type="number"
                    min="1"
                    value={formValues.tokenCost}
                    onChange={(e) =>
                      setFormValues((v) => ({ ...v, tokenCost: e.target.value }))
                    }
                    placeholder="Cost"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-sm"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Short description (optional)</label>
                <textarea
                  rows={2}
                  value={formValues.description}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, description: e.target.value }))
                  }
                  placeholder="Brief offer description"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none shadow-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Optional expiry</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formValues.expiryDate}
                      onChange={(e) =>
                        setFormValues((v) => ({
                          ...v,
                          expiryDate: e.target.value,
                        }))
                      }
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[44px] sm:min-h-[42px]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingReward}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/30 hover:bg-primary/95 active:scale-[0.98] disabled:opacity-60 min-h-[44px] touch-manipulation transition-all"
                >
                  {savingReward ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingReward ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingReward ? "Update Reward" : "Add Reward"}
                </button>
              </div>
              {formError && (
                <p className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </p>
              )}
            </form>

            {/* ── Active Rewards: responsive grid of atomic cards ── */}
            <div className="px-5 sm:px-6 py-4 flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Active Rewards
                </h3>
                {!loadingRewards && rewardsList.length > 0 && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                    {rewardsList.length} {rewardsList.length === 1 ? "reward" : "rewards"}
                  </span>
                )}
              </div>
              {loadingRewards ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium text-slate-500">Loading rewards…</p>
                </div>
              ) : rewardsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
                    <Gift className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-base font-bold text-slate-700 dark:text-slate-200">No rewards yet</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[260px]">
                    Create your first offer to start accepting token redemptions from cyclists.
                  </p>
                  <button
                    type="button"
                    onClick={() => document.getElementById("reward-form")?.scrollIntoView({ behavior: "smooth" })}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first reward
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rewardsList.map((r) => (
                    <div
                      key={r._id}
                      className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-[0_4px_14px_rgba(0,0,0,0.06)] dark:shadow-none border dark:border-slate-700"
                    >
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-500" aria-hidden />
                      <div className="flex items-start justify-between gap-3 pt-0.5">
                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate flex-1 min-w-0" title={r.title}>
                          {r.title}
                        </h4>
                        <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 text-xs font-bold">
                          {r.tokenCost} tokens
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2" title={r.description}>
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {r.expiryDate
                              ? new Date(r.expiryDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "No expiry"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditReward(r)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                            aria-label="Edit reward"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReward(r._id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"
                            aria-label="Delete reward"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>

          {/* Recent Redemptions — modern activity feed, glassmorphism, purple-pink accents */}
          <motion.div
            custom={6}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.32)] dark:shadow-none border border-white/20 dark:border-slate-700 overflow-hidden min-w-0"
          >
            <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border border-amber-200/60 dark:border-amber-700/40 shadow-sm">
                  <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Recent Redemptions</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Latest token redemptions at your shop</p>
                </div>
              </div>
            </div>
            <div className="p-3 sm:p-4 space-y-2.5">
              {loadingRecentRedemptions ? (
                [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-700/30 min-w-0 animate-pulse"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-600 rounded" />
                        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-600 rounded" />
                      </div>
                    </div>
                    <div className="h-7 w-12 bg-slate-200 dark:bg-slate-600 rounded-full shrink-0" />
                  </div>
                ))
              ) : recentRedemptions.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No recent redemptions</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Complete a scan to see redemptions here</p>
                </div>
              ) : (
                recentRedemptions.map((item) => (
                  <div
                    key={item._id || item.createdAt}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600/50 shadow-sm hover:scale-[1.01] hover:shadow-md hover:border-purple-200/60 dark:hover:border-purple-500/30 transition-all duration-200 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300 shrink-0 ring-2 ring-white dark:ring-slate-700 shadow-sm">
                        {(item.cyclistName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.cyclistName || "—"}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{timeAgo(item.createdAt)}</p>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs font-bold">
                      −{item.tokens}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
