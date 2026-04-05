/**
 * pages/AdminDashboard.jsx
 * --------------------------------------------------
 * Super Admin Dashboard: stats, users, routes, payouts, chart.
 * Protected: user.role === "admin". JWT on all API calls.
 * Theme: Clean white with Maroon (#80134D) accents.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import toast from "react-hot-toast";
import axios from "axios";
import { getHazards } from "../services/hazardService";
import {
  Users,
  Map,
  Route,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Store,
  Trash2,
  Ban,
  CheckCircle,
  Loader2,
  ChevronRight,
  DollarSign,
  Calendar,
  Check,
  X,
} from "lucide-react";
import RoutePreviewModal from "../components/RoutePreviewModal";
import useAuth from "../hooks/useAuth";
import {
  getAdminStats,
  getAdminUserGrowthStats,
  getAdminUsers,
  verifyUser,
  blockUser,
  deleteUser,
  getAdminRoutes,
  getPendingRoutes,
  approveRoute,
  rejectRoute,
  deleteAdminRoute,
  getAdminPayouts,
  getAdminPayments,
  calculatePayouts,
  processPayout,
  getPayoutRequests,
  getPayhereInit,
  rejectPayoutRequest,
} from "../services/adminService";
import BankInfoModal from "../components/admin/BankInfoModal";
import RejectPayoutRequestModal from "../components/admin/RejectPayoutRequestModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
);

const MAROON = "#80134D";

/** Inline bank details for Pending payouts/requests so Admin can verify before Approve (Requirement vi). */
function PendingBankDetails({ partner, className = "" }) {
  const bd = partner?.bankDetails || {};
  const hasAny = [bd.bankName, bd.branchName, bd.accountNo, bd.accountHolderName].some((v) => v && String(v).trim());
  if (!hasAny) return <p className={`text-xs text-amber-600 ${className}`}>Bank details not provided</p>;
  return (
    <div className={`text-xs text-slate-600 mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 ${className}`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Verify before approve</p>
      <p className="font-medium text-slate-700">{bd.bankName || "—"}{bd.branchName ? ` · ${bd.branchName}` : ""}</p>
      <p className="text-slate-600">Account: <span className="font-mono">{bd.accountNo || "—"}</span> · {bd.accountHolderName || "—"}</p>
    </div>
  );
}

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

const TABS = [
  { id: "overview", label: "Overview", icon: ShieldCheck },
  { id: "users", label: "Users & Partners", icon: Users },
  { id: "routes", label: "Route Moderation", icon: Route },
  { id: "hazards", label: "Hazard Reports", icon: AlertTriangle },
  { id: "payouts", label: "Payout Management", icon: DollarSign },
];

const VALID_TABS = ["overview", "users", "routes", "hazards", "payouts"];

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "overview"
  );

  // Default tab in URL so sidebar highlights correctly
  useEffect(() => {
    if (!tabFromUrl || !VALID_TABS.includes(tabFromUrl)) {
      setSearchParams({ tab: "overview" }, { replace: true });
    }
  }, []);
  // Sync tab from URL when user clicks sidebar (e.g. /admin-panel?tab=users)
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const setTab = (id) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [pendingRoutes, setPendingRoutes] = useState([]);
  const [previewRoute, setPreviewRoute] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [hazards, setHazards] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingPayoutRequests, setLoadingPayoutRequests] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingHazards, setLoadingHazards] = useState(false);

  const [actioning, setActioning] = useState(null);
  const [actioningRouteId, setActioningRouteId] = useState(null);
  const [payoutMonth, setPayoutMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [calculating, setCalculating] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [bankModalPartner, setBankModalPartner] = useState(null);
  const [rejectModalRequest, setRejectModalRequest] = useState(null);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [adminApi404, setAdminApi404] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState("all"); // "all" | "cyclist" | "partner" | "admin"
  const [growthPeriod, setGrowthPeriod] = useState("thisYear"); // "thisYear" | "thisMonth"
  const [growthData, setGrowthData] = useState(null);
  const [loadingGrowth, setLoadingGrowth] = useState(true);

  useEffect(() => {
    if (!token) return;
    setAdminApi404(false);
    getAdminStats(token)
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        if (err.response?.status === 404) setAdminApi404(true);
        toast.error(
          err.response?.status === 404
            ? "Admin API not found. Restart the backend (cd backend && npm run dev) then refresh."
            : err.response?.data?.message || "Failed to load stats",
          { id: "admin-stats", duration: 6000 }
        );
      })
      .finally(() => setLoadingStats(false));
  }, [token]);

  useEffect(() => {
    if (!token || activeTab !== "overview") return;
    setLoadingGrowth(true);
    getAdminUserGrowthStats(token, growthPeriod)
      .then(setGrowthData)
      .catch((err) => {
        if (err.response?.status === 404) setAdminApi404(true);
        toast.error(
          err.response?.data?.message || "Failed to load growth stats",
          { id: "admin-growth", duration: 4000 }
        );
      })
      .finally(() => setLoadingGrowth(false));
  }, [token, activeTab, growthPeriod]);

  useEffect(() => {
    if (activeTab === "users" && token) {
      setLoadingUsers(true);
      getAdminUsers(token)
        .then(setUsers)
        .catch(() => toast.error("Failed to load users"))
        .finally(() => setLoadingUsers(false));
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab !== "routes" || !token) return;
    setLoadingRoutes(true);
    setLoadingPending(true);
    Promise.all([getAdminRoutes(token), getPendingRoutes(token)])
      .then(([allRoutes, pending]) => {
        setRoutes(Array.isArray(allRoutes) ? allRoutes : []);
        setPendingRoutes(Array.isArray(pending) ? pending : []);
      })
      .catch((err) => {
        const msg = err.response?.status === 401
          ? "Session expired or not authorized. Please sign in again."
          : err.response?.data?.message || "Failed to load routes";
        toast.error(msg);
      })
      .finally(() => {
        setLoadingRoutes(false);
        setLoadingPending(false);
      });
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab !== "hazards" || !token) return;
    setLoadingHazards(true);
    getHazards()
      .then((data) => {
        setHazards(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        const msg = err.response?.status === 401
          ? "Session expired or not authorized. Please sign in again."
          : err.response?.data?.message || "Failed to load hazards";
        toast.error(msg);
      })
      .finally(() => {
        setLoadingHazards(false);
      });
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === "payouts" && token) {
      setLoadingPayouts(true);
      setLoadingPayments(true);
      setLoadingPayoutRequests(true);
      getAdminPayouts(token)
        .then(setPayouts)
        .catch(() => toast.error("Failed to load payouts"))
        .finally(() => setLoadingPayouts(false));
      getAdminPayments(token)
        .then(setPayments)
        .catch(() => toast.error("Failed to load payments"))
        .finally(() => setLoadingPayments(false));
      getPayoutRequests(token)
        .then(setPayoutRequests)
        .catch((err) => {
          if (err.response?.status === 404) {
            toast.error("Payout requests endpoint not found. Restart backend: cd backend && npm run dev", { duration: 6000 });
          } else {
            toast.error(err.response?.data?.message || "Failed to load payout requests");
          }
        })
        .finally(() => setLoadingPayoutRequests(false));
    }
  }, [activeTab, token]);

  // When returning from PayHere in same tab: refetch and show toast
  useEffect(() => {
    if (activeTab !== "payouts" || !token || typeof window !== "undefined" && window.opener) return;
    const payhere = searchParams.get("payhere");
    if (payhere !== "success") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("payhere");
      return next;
    }, { replace: true });
    getPayoutRequests(token)
      .then(setPayoutRequests)
      .catch(() => {});
    toast.success("Payment completed. Payout request updated.", { iconTheme: { primary: MAROON } });
  }, [activeTab, token, searchParams]);

  // When this page is the PayHere return/cancel popup: notify opener and close
  useEffect(() => {
    if (typeof window === "undefined" || !window.opener) return;
    const payhere = searchParams.get("payhere");
    if (!payhere) return;
    try {
      window.opener.postMessage({ type: "payhere-return", payhere }, window.location.origin);
    } catch (_) {}
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("payhere");
      return next;
    }, { replace: true });
    const id = setTimeout(() => window.close(), 1200);
    return () => clearTimeout(id);
  }, [searchParams]);

  // PayHere SDK callbacks handle payment status updates (see handleApproveAndPayPayHere)

  /** Open PayHere checkout using JavaScript SDK modal */
  const handleApproveAndPayPayHere = async (requestId) => {
    if (!token) return;
    setProcessingRequestId(requestId);

    try {
      // Get payment parameters from backend
      const { formData } = await getPayhereInit(token, requestId);

      // Track if payment was completed
      let paymentCompleted = false;
      let pollAttempts = 0;
      const maxPollAttempts = 15; // Poll for 30 seconds (15 × 2s)

      // Polling function to check status
      const pollForStatusUpdate = async () => {
        if (pollAttempts >= maxPollAttempts) {
          toast.info("Payment may still be processing. Refresh the page to see the latest status.", {
            duration: 5000,
            iconTheme: { primary: MAROON }
          });
          return;
        }

        try {
          const requests = await getPayoutRequests(token);
          const updatedRequest = requests.find(r => r._id === requestId);

          if (updatedRequest && updatedRequest.status === "Paid") {
            // Status updated successfully
            setPayoutRequests(requests);
            toast.success("Payment successful! Payout request has been processed.", {
              duration: 5000,
              iconTheme: { primary: MAROON }
            });
            return;
          }

          // Continue polling
          pollAttempts++;
          setTimeout(pollForStatusUpdate, 2000);
        } catch (err) {
          console.error("Poll error:", err);
          pollAttempts++;
          if (pollAttempts < maxPollAttempts) {
            setTimeout(pollForStatusUpdate, 2000);
          }
        }
      };

      // Configure PayHere callbacks
      window.payhere.onCompleted = async function onCompleted(orderId) {
        console.log("Payment completed. OrderID:", orderId);
        paymentCompleted = true;

        toast.success("Payment successful! Updating status...", {
          duration: 3000,
          iconTheme: { primary: MAROON }
        });

        try {
          // Call backend to mark as paid immediately
          const BASE = import.meta.env.VITE_API_URL ?? "";
          const API_URL = BASE ? `${BASE}/payments` : "/api/payments";
          const response = await fetch(`${API_URL}/payhere/mark-paid`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId: orderId })
          });

          const data = await response.json();

          if (data.success) {
            console.log("[PayHere] Status updated successfully");

            // Refresh payout requests to show updated status
            const requests = await getPayoutRequests(token);
            setPayoutRequests(requests);

            toast.success("Payment processed! Payout request completed.", {
              duration: 5000,
              iconTheme: { primary: MAROON }
            });
          } else {
            throw new Error(data.message || "Failed to update status");
          }

        } catch (err) {
          console.error("[PayHere] Failed to update status:", err);
          toast.error("Payment succeeded but status update failed. Please refresh the page.", {
            duration: 6000
          });

          // Fallback: still try polling as backup
          setTimeout(pollForStatusUpdate, 2000);
        }
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log("Payment dismissed");
        if (!paymentCompleted) {
          toast.info("Payment cancelled", {
            iconTheme: { primary: MAROON }
          });
        }
      };

      window.payhere.onError = function onError(error) {
        console.log("Payment error:", error);
        toast.error(`Payment failed: ${error}`, {
          duration: 6000
        });
      };

      // Start PayHere modal
      window.payhere.startPayment(formData);

    } catch (err) {
      console.error("PayHere init error:", err);
      toast.error(err.response?.data?.message || "Failed to initialize payment");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleVerify = async (u) => {
    setActioning(u._id);
    try {
      await verifyUser(token, u._id);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isVerified: true, status: "Active" } : x)));
      toast.success("User verified", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to verify");
    } finally {
      setActioning(null);
    }
  };

  const handleBlock = async (u, block) => {
    setActioning(u._id);
    try {
      await blockUser(token, u._id, block);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isBlocked: block, status: block ? "Blocked" : (x.role === "partner" && !x.isVerified ? "Pending" : "Active") } : x)));
      toast.success(block ? "User blocked" : "User unblocked", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    } finally {
      setActioning(null);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    setActioning(u._id);
    try {
      await deleteUser(token, u._id);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      toast.success("User deleted", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete");
    } finally {
      setActioning(null);
    }
  };

  const handleDeleteRoute = async (r) => {
    if (!window.confirm("Delete this route? This cannot be undone.")) return;
    setActioning(r._id);
    try {
      await deleteAdminRoute(token, r._id);
      setRoutes((prev) => prev.filter((x) => x._id !== r._id));
      setPendingRoutes((prev) => prev.filter((x) => x._id !== r._id));
      toast.success("Route deleted", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete");
    } finally {
      setActioning(null);
    }
  };

  const handleApproveRoute = async (r) => {
    setActioningRouteId(r._id);
    try {
      await approveRoute(token, r._id);
      setPendingRoutes((prev) => prev.filter((x) => x._id !== r._id));
      setRoutes((prev) => [...prev, { ...r, status: "approved" }]);
      setPreviewRoute(null);
      toast.success("Route approved — now visible on the map", { iconTheme: { primary: "#22c55e" } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve");
    } finally {
      setActioningRouteId(null);
    }
  };

  const handleRejectRoute = async (r) => {
    setActioningRouteId(r._id);
    try {
      await rejectRoute(token, r._id);
      setPendingRoutes((prev) => prev.filter((x) => x._id !== r._id));
      setPreviewRoute(null);
      toast.success("Route rejected", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to reject");
    } finally {
      setActioningRouteId(null);
    }
  };

  const handleModerateHazard = async (hazardId, updates) => {
    setActioning(hazardId);
    try {
      const { data } = await axios.patch(
        `/api/hazards/${hazardId}/moderate`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHazards((prev) => prev.map((h) => (h._id === hazardId ? data : h)));
      toast.success("Hazard moderated", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to moderate hazard");
    } finally {
      setActioning(null);
    }
  };

  const handleForceDeleteHazard = async (hazardId) => {
    if (!window.confirm("Delete this hazard report? This cannot be undone.")) return;
    setActioning(hazardId);
    try {
      await axios.delete(`/api/hazards/${hazardId}/force`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHazards((prev) => prev.filter((h) => h._id !== hazardId));
      toast.success("Hazard deleted", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete hazard");
    } finally {
      setActioning(null);
    }
  };

  const handleCleanupStaleHazards = async () => {
    if (!window.confirm("Mark all stale hazards (30+ days, no verifications) as expired?")) return;
    setActioning("cleanup");
    try {
      const { data } = await axios.post("/api/hazards/cleanup", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(data.message || "Cleanup complete", { iconTheme: { primary: MAROON } });
      // Refresh hazards list
      const updatedHazards = await getHazards();
      setHazards(Array.isArray(updatedHazards) ? updatedHazards : []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to cleanup hazards");
    } finally {
      setActioning(null);
    }
  };

  const handleCalculatePayouts = async () => {
    setCalculating(true);
    try {
      const res = await calculatePayouts(token, payoutMonth);
      toast.success(res.message || "Payouts calculated", { iconTheme: { primary: MAROON } });
      const list = await getAdminPayouts(token);
      setPayouts(list);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to calculate");
    } finally {
      setCalculating(false);
    }
  };

  const handleProcessPayout = async (p) => {
    setProcessingPayoutId(p._id);
    try {
      await processPayout(token, p._id);
      setPayouts((prev) => prev.map((x) => (x._id === p._id ? { ...x, status: "Paid" } : x)));
      toast.success("Payout processed", { iconTheme: { primary: MAROON } });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to process payout");
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const PINK = "#C73E84";
  const growthChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2.2,
    layout: { padding: { top: 12, right: 16, bottom: 8, left: 8 } },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: { family: "Inter", size: 12, weight: "600" },
          color: "#475569",
        },
      },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.92)",
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (items) => items[0]?.label || "",
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          autoSkip: growthData?.labels?.length > 14,
          maxRotation: 45,
          minRotation: 0,
          font: { size: 11, weight: "500" },
          color: "#64748b",
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: 11, weight: "500" },
          color: "#64748b",
        },
        grid: { color: "rgba(148,163,184,0.2)" },
      },
    },
  };

  const growthChartDataConfig = growthData
    ? {
        labels: growthData.labels,
        datasets: [
          {
            label: "Cyclists",
            data: growthData.userData ?? [],
            borderColor: MAROON,
            backgroundColor: "rgba(128,19,77,0.1)",
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: MAROON,
            pointBorderColor: "#fff",
            pointBorderWidth: 1,
            pointRadius: 3,
          },
          {
            label: "Partners",
            data: growthData.partnerData ?? [],
            borderColor: PINK,
            backgroundColor: "rgba(199,62,132,0.1)",
            borderWidth: 2,
            tension: 0.3,
            pointBackgroundColor: PINK,
            pointBorderColor: "#fff",
            pointBorderWidth: 1,
            pointRadius: 3,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <motion.div custom={0} variants={fadeIn} initial="hidden" animate="visible" className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back,{" "}
            <span style={{ color: MAROON }}>{user?.name || "Admin"}</span>
          </h1>
          <p className="mt-0.5 sm:mt-1 text-slate-500 dark:text-slate-400 text-xs sm:text-sm lg:text-base">
            Manage users, routes, and partner payouts. Keep the platform safe and running.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-slate-200 pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                style={activeTab === tab.id ? { backgroundColor: MAROON } : {}}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <>
            {adminApi404 && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <strong>Why you see this:</strong> The server returned 404 for the Admin API. The backend that is running is either an old instance (started before Admin was added) or not running. <strong>Fix:</strong> Stop the process on port 5000, then run <code className="bg-amber-100 px-1 rounded">cd backend && npm run dev</code>. After you see &quot;Admin API: GET /api/admin/stats...&quot;, refresh this page.
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {loadingStats ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-5 border dark:border-slate-700 animate-pulse h-32 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-none"
                  />
                ))
              ) : (
                [
                  { icon: Users, label: "Total Users", value: stats?.totalUsers ?? 0, color: MAROON, bgLight: "rgba(128,19,77,0.08)" },
                  { icon: Store, label: "Partners", value: stats?.totalPartners ?? 0, color: "#0ea5e9", bgLight: "rgba(14,165,233,0.08)" },
                  { icon: Route, label: "Saved Routes", value: stats?.totalRoutes ?? 0, color: "#22c55e", bgLight: "rgba(34,197,94,0.08)" },
                  { icon: AlertTriangle, label: "Reported Hazards", value: stats?.totalHazards ?? 0, color: "#f59e0b", bgLight: "rgba(245,158,11,0.08)" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    custom={i + 1}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="group relative bg-white dark:bg-slate-800 backdrop-blur rounded-3xl overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.12)] dark:shadow-none border dark:border-slate-700 hover:shadow-[0_26px_70px_rgba(15,23,42,0.18)] dark:hover:border-slate-600 transition-all duration-300"
                    style={{
                      WebkitFontSmoothing: "antialiased",
                    }}
                  >
                    {/* Colored top accent bar */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: s.color }} />
                    <div className="p-4 sm:p-5">
                      <div
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-105"
                        style={{
                          backgroundColor: "#ffffff",
                          color: s.color,
                          boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
                        }}
                      >
                        <s.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <p
                        className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {s.value}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {s.label}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            {/* User & Partner Growth Over Time — Line chart */}
            <motion.div
              custom={5}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="mt-6 bg-white rounded-3xl border border-slate-200/60 overflow-hidden"
              style={{
                boxShadow: "0 0 0 1px rgba(15,23,42,0.03), 0 2px 4px rgba(15,23,42,0.04), 0 12px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${MAROON} 0%, ${PINK} 100%)` }} />
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-800">User & Partner Growth Over Time</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGrowthPeriod("thisMonth")}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        growthPeriod === "thisMonth" ? "text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                      }`}
                      style={growthPeriod === "thisMonth" ? { backgroundColor: MAROON } : {}}
                    >
                      This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrowthPeriod("thisYear")}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        growthPeriod === "thisYear" ? "text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
                      }`}
                      style={growthPeriod === "thisYear" ? { backgroundColor: MAROON } : {}}
                    >
                      This Year
                    </button>
                  </div>
                </div>
                <div className="relative" style={{ minHeight: 280 }}>
                  {loadingGrowth ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: MAROON }} />
                    </div>
                  ) : growthChartDataConfig ? (
                    <Line data={growthChartDataConfig} options={growthChartOptions} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-slate-500 font-medium">No growth data</p>
                      <p className="text-xs text-slate-400 mt-1">Data will appear once users and partners exist</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Users & Partners — professional premium UI */}
        {activeTab === "users" && (
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-3xl overflow-hidden border border-slate-200/60"
            style={{
              boxShadow: "0 0 0 1px rgba(15,23,42,0.03), 0 2px 4px rgba(15,23,42,0.04), 0 12px 24px rgba(15,23,42,0.08)",
            }}
          >
            {/* Top accent */}
            <div
              className="h-1.5 w-full"
              style={{ background: `linear-gradient(90deg, ${MAROON} 0%, #b81b5e 50%, #d94680 100%)` }}
            />
            {/* Header with subtle gradient */}
            <div
              className="px-6 sm:px-8 py-6 border-b border-slate-100"
              style={{ background: "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(255,255,255,1) 100%)" }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${MAROON} 0%, #a0155e 100%)`,
                      boxShadow: `0 4px 14px ${MAROON}40`,
                    }}
                  >
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Users & Partners</h2>
                      <span
                        className="min-w-[1.5rem] h-6 px-2 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: MAROON }}
                      >
                        {users.filter((u) => userRoleFilter === "all" || u.role === userRoleFilter).length}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Manage accounts and roles</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { value: "all", label: "All", icon: Users },
                    { value: "cyclist", label: "Cyclists", icon: UserCheck },
                    { value: "partner", label: "Partners", icon: Store },
                    { value: "admin", label: "Admins", icon: ShieldCheck },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = userRoleFilter === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        onClick={() => setUserRoleFilter(opt.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          active
                            ? "text-white shadow-lg ring-2 ring-offset-2 ring-white/50"
                            : "text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        style={
                          active
                            ? { backgroundColor: MAROON, boxShadow: `0 4px 12px ${MAROON}50` }
                            : {}
                        }
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </motion.button>
                    );
                  })}
                  {loadingUsers && <Loader2 className="w-5 h-5 animate-spin ml-1" style={{ color: MAROON }} />}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200/80">
                    <th className="px-6 py-4 pl-8">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Shop / Status</th>
                    <th className="px-6 py-4 pr-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => userRoleFilter === "all" || u.role === userRoleFilter)
                    .map((u, idx) => (
                      <motion.tr
                        key={u._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className={`group border-b border-slate-100 transition-all duration-200 ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        } hover:bg-[#80134D]/[0.06] hover:border-l-4 hover:border-l-[#80134D]`}
                        style={{ borderLeftColor: "transparent" }}
                      >
                        <td className="px-6 py-4 pl-8">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-bold text-white shrink-0 ring-2 ring-white shadow-md"
                              style={{
                                background:
                                  u.role === "admin"
                                    ? "linear-gradient(135deg, #475569 0%, #64748b 100%)"
                                    : u.role === "partner"
                                      ? "linear-gradient(135deg, #b45309 0%, #d97706 100%)"
                                      : "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
                                boxShadow:
                                  u.role === "admin"
                                    ? "0 4px 12px rgba(71,85,105,0.35)"
                                    : u.role === "partner"
                                      ? "0 4px 12px rgba(217,119,6,0.35)"
                                      : "0 4px 12px rgba(14,165,233,0.35)",
                              }}
                            >
                              {(u.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 tracking-tight">{u.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide border ${
                              u.role === "admin"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : u.role === "partner"
                                  ? "bg-amber-50 text-amber-600 border-amber-200/80"
                                  : "bg-sky-50 text-sky-600 border-sky-200/80"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {u.role === "partner" ? (
                            <div className="inline-flex items-center gap-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 px-3.5 py-2 shadow-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide shrink-0 ${
                                  u.status === "Blocked"
                                    ? "bg-red-100 text-red-600 border border-red-200/80"
                                    : u.status === "Pending"
                                      ? "bg-amber-100 text-amber-600 border border-amber-200/80"
                                      : "bg-emerald-100 text-emerald-600 border border-emerald-200/80"
                                }`}
                              >
                                {u.status}
                              </span>
                              <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]" title={u.shopName || "—"}>
                                {u.shopName || "—"}
                              </span>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border ${
                                u.status === "Blocked"
                                  ? "bg-red-50 text-red-600 border-red-200/80"
                                  : u.status === "Pending"
                                    ? "bg-amber-50 text-amber-600 border-amber-200/80"
                                    : "bg-emerald-50 text-emerald-600 border-emerald-200/80"
                              }`}
                            >
                              {u.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 pr-8 text-right">
                          {u.role !== "admin" && (
                            <div className="flex items-center justify-end gap-1">
                              {!u.isVerified && u.role !== "cyclist" && (
                                <button
                                  type="button"
                                  onClick={() => handleVerify(u)}
                                  disabled={actioning === u._id}
                                  className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-md disabled:opacity-50 transition-all duration-200"
                                  title="Verify"
                                >
                                  {actioning === u._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleBlock(u, !u.isBlocked)}
                                disabled={actioning === u._id}
                                className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 hover:shadow-md disabled:opacity-50 transition-all duration-200"
                                title={u.isBlocked ? "Unblock" : "Block"}
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={actioning === u._id}
                                className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md disabled:opacity-50 transition-all duration-200"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
            {users.filter((u) => userRoleFilter === "all" || u.role === userRoleFilter).length === 0 && !loadingUsers && (
              <div className="py-20 px-8 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 opacity-90"
                  style={{ background: `linear-gradient(135deg, ${MAROON}18 0%, ${MAROON}08 100%)` }}
                >
                  <Users className="w-10 h-10" style={{ color: MAROON }} />
                </div>
                <p className="text-lg font-bold text-slate-700">
                  {userRoleFilter === "all" ? "No users yet" : `No ${userRoleFilter}s found`}
                </p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  {userRoleFilter === "all" ? "Users will appear here once they sign up." : "Try selecting another filter above."}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Route Moderation — Pending Approvals + Community Routes */}
        {activeTab === "routes" && (
          <>
            {/* Pending Approvals table */}
            <motion.div
              custom={0}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="mb-6 bg-white rounded-3xl overflow-hidden border border-amber-200/80 shadow-md"
              style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.1), 0 4px 16px rgba(15,23,42,0.06)" }}
            >
              <div className="h-1.5 w-full bg-amber-500" />
              <div className="px-6 sm:px-8 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Pending Approvals</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Approve or reject new routes so they appear on the map</p>
                </div>
                {loadingPending && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading…</span>
                  </div>
                )}
              </div>
              {pendingRoutes.length === 0 && !loadingPending ? (
                <div className="px-6 py-8 text-center text-slate-500 text-sm">
                  No pending routes. New routes will appear here for approval.
                </div>
              ) : (
                <div className="overflow-x-auto max-w-full">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200/80">
                        <th className="px-6 py-3 pl-8">Route</th>
                        <th className="px-6 py-3">Creator</th>
                        <th className="px-6 py-3">Distance</th>
                        <th className="px-6 py-3 pr-8 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRoutes.map((r) => (
                        <tr key={r._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 pl-8">
                            <button
                              type="button"
                              onClick={() => setPreviewRoute(r)}
                              className="flex flex-col gap-1 max-w-xs text-left w-full rounded-lg hover:bg-amber-50/80 px-2 py-1 -mx-2 -my-1 transition-colors group"
                            >
                              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-amber-800" title={r.startLocation}>{r.startLocation}</p>
                              <p className="text-sm text-slate-600 truncate group-hover:text-amber-700" title={r.endLocation}>→ {r.endLocation}</p>
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-700">{r.creatorId?.name || r.creatorId?.email || "—"}</p>
                            {r.creatorId?.email && <p className="text-xs text-slate-400">{r.creatorId.email}</p>}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{r.distance || "—"}</td>
                          <td className="px-6 py-4 pr-8 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setPreviewRoute(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                                title="View route on map"
                              >
                                <Map className="w-4 h-4" />
                                View on Map
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveRoute(r)}
                                disabled={actioningRouteId === r._id}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all"
                              >
                                {actioningRouteId === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectRoute(r)}
                                disabled={actioningRouteId === r._id}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 shadow-sm disabled:opacity-50 transition-all"
                              >
                                {actioningRouteId === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Community Routes table */}
            <motion.div
              custom={0}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/60"
              style={{
                boxShadow: "0 0 0 1px rgba(15,23,42,0.03), 0 2px 4px rgba(15,23,42,0.04), 0 12px 24px rgba(15,23,42,0.08)",
              }}
            >
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${MAROON} 0%, #a0155e 100%)` }} />
              <div className="px-6 sm:px-8 py-6 border-b border-slate-100" style={{ background: "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(255,255,255,1) 100%)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #a0155e 100%)`, boxShadow: `0 4px 12px ${MAROON}40` }}>
                      <Route className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight">Community Routes</h2>
                      <p className="text-sm text-slate-500 mt-0.5">Review and moderate user-contributed routes</p>
                    </div>
                  </div>
                  {loadingRoutes && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: MAROON }} />
                      <span>Loading…</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200/80">
                    <th className="px-6 py-4 pl-8">Route</th>
                    <th className="px-6 py-4">Creator</th>
                    <th className="px-6 py-4">Distance</th>
                    <th className="px-6 py-4 pr-8 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r, idx) => (
                    <motion.tr
                      key={r._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`group border-b border-slate-100 transition-all duration-200 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } hover:bg-[#80134D]/[0.06] hover:border-l-4 hover:border-l-[#80134D]`}
                      style={{ borderLeftColor: "transparent" }}
                    >
                      <td className="px-6 py-4 pl-8">
                        <div className="flex flex-col gap-2 max-w-md">
                          <div
                            className="px-3 py-2 rounded-xl border shadow-sm"
                            style={{ backgroundColor: "#f1f5f9", borderColor: "#cbd5f5" }}
                            title={r.startLocation}
                          >
                            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">From</span>
                            <p className="text-sm font-medium text-slate-800 mt-0.5 truncate whitespace-nowrap overflow-hidden">
                              {r.startLocation}
                            </p>
                          </div>
                          <div
                            className="px-3 py-2 rounded-xl border shadow-sm"
                            style={{ backgroundColor: "#fef2f8", borderColor: "#f9a8d4" }}
                            title={r.endLocation}
                          >
                            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wide">To</span>
                            <p className="text-sm font-medium text-slate-800 mt-0.5 truncate whitespace-nowrap overflow-hidden">
                              {r.endLocation}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <p className={`font-semibold tracking-tight ${(r.creatorId?.name || r.creatorId?.email || r.creator?.name || r.creator?.email) ? "" : "text-slate-400 italic font-normal"}`} style={(r.creatorId?.name || r.creatorId?.email || r.creator?.name || r.creator?.email) ? { color: MAROON } : undefined}>
                            {(r.creatorId?.name || r.creatorId?.email || r.creator?.name || r.creator?.email) || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {r.distance ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/80">
                            {typeof r.distance === "number" ? `${r.distance} km` : r.distance}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 pr-8 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteRoute(r)}
                          disabled={actioning === r._id}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md border border-red-200/60 text-sm font-semibold disabled:opacity-50 transition-all duration-200"
                        >
                          {actioning === r._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {routes.length === 0 && !loadingRoutes && (
              <div className="py-20 px-8 text-center">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 opacity-90"
                  style={{ background: `linear-gradient(135deg, ${MAROON}18 0%, ${MAROON}08 100%)` }}
                >
                  <Route className="w-10 h-10" style={{ color: MAROON }} />
                </div>
                <p className="text-lg font-bold text-slate-700">No community routes</p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Routes shared by users will appear here for moderation.
                </p>
              </div>
            )}
            </motion.div>
          </>
        )}

        {/* Hazard Reports Management */}
        {activeTab === "hazards" && (
          <motion.div
            custom={0}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-3xl overflow-hidden border border-slate-200/60"
            style={{
              boxShadow: "0 0 0 1px rgba(15,23,42,0.03), 0 2px 4px rgba(15,23,42,0.04), 0 12px 24px rgba(15,23,42,0.08)",
            }}
          >
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 to-red-500" />
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100" style={{ background: "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(255,255,255,1) 100%)" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br from-amber-500 to-red-500">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Hazard Reports</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Moderate community-reported hazards and cleanup stale reports</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {loadingHazards && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                      <span>Loading…</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleCleanupStaleHazards}
                    disabled={actioning === "cleanup"}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
                  >
                    {actioning === "cleanup" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Cleanup Stale Hazards
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-200/80">
                    <th className="px-6 py-4 pl-8">Type & Description</th>
                    <th className="px-6 py-4">Reporter</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Verifications</th>
                    <th className="px-6 py-4">Created</th>
                    <th className="px-6 py-4 pr-8 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hazards.map((h, idx) => (
                    <motion.tr
                      key={h._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`group border-b border-slate-100 transition-all duration-200 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } hover:bg-amber-50/30 hover:border-l-4 hover:border-l-amber-500`}
                      style={{ borderLeftColor: "transparent" }}
                    >
                      <td className="px-6 py-4 pl-8">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase bg-red-100 text-red-700">
                              {h.type}
                            </span>
                            {!h.active && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase bg-slate-200 text-slate-600">
                                Hidden
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <p className="text-sm text-slate-600 max-w-md truncate">{h.description}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            Lat: {h.lat?.toFixed(6)}, Lng: {h.lng?.toFixed(6)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {h.reportedBy?.name || "Unknown"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          h.status === "verified" ? "bg-blue-100 text-blue-700" :
                          h.status === "resolved" ? "bg-green-100 text-green-700" :
                          h.status === "invalid" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {h.status || "reported"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                          <span>✓ {h.existsCount || 0} exists</span>
                          <span>✓ {h.resolvedCount || 0} resolved</span>
                          <span>🚩 {h.spamCount || 0} spam</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {h.status !== "invalid" && (
                            <button
                              type="button"
                              onClick={() => handleModerateHazard(h._id, { status: "invalid", active: false, moderationNote: "Marked as invalid by admin" })}
                              disabled={actioning === h._id}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold disabled:opacity-50 transition-all"
                            >
                              {actioning === h._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                              Mark Invalid
                            </button>
                          )}
                          {h.status !== "resolved" && (
                            <button
                              type="button"
                              onClick={() => handleModerateHazard(h._id, { status: "resolved", moderationNote: "Marked as resolved by admin" })}
                              disabled={actioning === h._id}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-semibold disabled:opacity-50 transition-all"
                            >
                              {actioning === h._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Mark Resolved
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleForceDeleteHazard(h._id)}
                            disabled={actioning === h._id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-semibold disabled:opacity-50 transition-all"
                          >
                            {actioning === h._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hazards.length === 0 && !loadingHazards && (
              <div className="py-20 px-8 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 bg-gradient-to-br from-amber-100 to-red-100">
                  <AlertTriangle className="w-10 h-10 text-amber-600" />
                </div>
                <p className="text-lg font-bold text-slate-700">No hazard reports</p>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Community-reported hazards will appear here for moderation.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Payout Management — mobile responsive */}
        {activeTab === "payouts" && (
          <motion.div custom={0} variants={fadeIn} initial="hidden" animate="visible" className="space-y-4 px-0 sm:px-0">
            {/* Live Transactions (Payments) */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Live Transactions (Payments)</h2>
                {loadingPayments && <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: MAROON }} />}
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {payments.length === 0 && !loadingPayments && <p className="p-4 text-center text-slate-500 text-sm">No payment transactions yet.</p>}
                {payments.map((p) => (
                  <div key={p._id} className="p-3 sm:p-4 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-slate-800 text-sm">{p.userId?.name || "—"}</p>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "Success" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-700"}`}>{p.status || "Pending"}</span>
                    </div>
                    <p className="text-xs text-slate-400">{p.userId?.email}</p>
                    <p className="text-xs font-mono text-slate-600 break-all">{p.transactionId || "—"}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1">
                      <span>{p.amount != null ? p.amount.toLocaleString() : "—"} LKR</span>
                      <span>{p.productName || "Cycling Tour Package"}</span>
                      <span className="text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Transaction ID</th>
                      <th className="px-4 py-3">Amount (LKR)</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.userId?.name || "—"}</p>
                          <p className="text-xs text-slate-400">{p.userId?.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.transactionId || "—"}</td>
                        <td className="px-4 py-3 font-medium">{p.amount != null ? p.amount.toLocaleString() : "—"} LKR</td>
                        <td className="px-4 py-3">{p.productName || "Cycling Tour Package"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === "Success" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-700"}`}>
                            {p.status || "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payments.length === 0 && !loadingPayments && <p className="hidden md:block p-6 text-center text-slate-500">No payment transactions yet.</p>}
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <span className="text-sm font-medium text-slate-700">Calculate payouts for month:</span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                <input
                  type="month"
                  value={payoutMonth}
                  onChange={(e) => setPayoutMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm w-full sm:w-auto min-w-0"
                />
                <button
                  type="button"
                  onClick={handleCalculatePayouts}
                  disabled={calculating}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: MAROON }}
                >
                  {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  Calculate Payouts
                </button>
              </div>
            </div>
            {/* Partner payout requests (manual payouts from available balance) */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Payout Requests</h2>
                {loadingPayoutRequests && <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: MAROON }} />}
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {payoutRequests.length === 0 && !loadingPayoutRequests && <p className="p-4 text-center text-slate-500 text-sm">No payout requests yet.</p>}
                {payoutRequests.map((r) => (
                  <div key={r._id} className="p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{r.partnerId?.shopName || r.partnerId?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{r.partnerId?.email}</p>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "Paid" ? "bg-emerald-100 text-emerald-800" : r.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{r.amount?.toLocaleString()} LKR</p>
                    <p className="text-xs text-slate-600">Available: <span className="font-medium text-slate-800">{(r.partnerId?.partnerAvailableBalance ?? 0).toLocaleString()} LKR</span></p>
                    {r.rejectionReason && <p className="text-xs text-red-600">Rejection: {r.rejectionReason}</p>}
                    <p className="text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</p>
                    {r.status === "Pending" && <PendingBankDetails partner={r.partnerId} />}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setBankModalPartner(r.partnerId || null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        View Bank Info
                      </button>
                      {r.status === "Pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApproveAndPayPayHere(r._id)}
                            disabled={processingRequestId === r._id}
                            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                            style={{ backgroundColor: MAROON }}
                          >
                            {processingRequestId === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                            Approve &amp; Pay
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectModalRequest({ id: r._id, partnerName: r.partnerId?.shopName || r.partnerId?.name, amount: r.amount })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3">Partner</th>
                      <th className="px-4 py-3">Amount (LKR)</th>
                      <th className="px-4 py-3">Available (LKR)</th>
                      <th className="px-4 py-3">Requested At</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutRequests.map((r) => (
                      <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{r.partnerId?.shopName || r.partnerId?.name || "—"}</p>
                          <p className="text-xs text-slate-400">{r.partnerId?.email}</p>
                          {r.status === "Pending" && <PendingBankDetails partner={r.partnerId} className="mt-1" />}
                        </td>
                        <td className="px-4 py-3 font-semibold">{r.amount?.toLocaleString()} LKR</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{(r.partnerId?.partnerAvailableBalance ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.status === "Paid" ? "bg-emerald-100 text-emerald-800" : r.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
                          {r.rejectionReason && <p className="text-xs text-red-600 mt-0.5 max-w-[180px] truncate" title={r.rejectionReason}>{r.rejectionReason}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setBankModalPartner(r.partnerId || null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              View Bank Info
                            </button>
                            {r.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveAndPayPayHere(r._id)}
                                  disabled={processingRequestId === r._id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                                  style={{ backgroundColor: MAROON }}
                                >
                                  {processingRequestId === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                                  Approve &amp; Pay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectModalRequest({ id: r._id, partnerName: r.partnerId?.shopName || r.partnerId?.name, amount: r.amount })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payoutRequests.length === 0 && !loadingPayoutRequests && <p className="hidden md:block p-6 text-center text-slate-500">No payout requests yet.</p>}
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-100 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Payout Management</h2>
                {loadingPayouts && <Loader2 className="w-5 h-5 shrink-0 animate-spin" style={{ color: MAROON }} />}
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {payouts.length === 0 && !loadingPayouts && <p className="p-4 text-center text-slate-500 text-sm">No payouts. Use &quot;Calculate Payouts&quot; for a month.</p>}
                {payouts.map((p) => (
                  <div key={p._id} className="p-3 sm:p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{p.partnerId?.shopName || p.partnerId?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{p.partnerId?.email}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-600">
                      <span>{p.month}</span>
                      <span>{p.totalTokens} tokens</span>
                      <span className="font-semibold text-slate-800">{p.totalAmount?.toLocaleString()} LKR</span>
                    </div>
                    <p className="text-xs text-slate-600">Available: <span className="font-medium text-slate-800">{(p.partnerId?.partnerAvailableBalance ?? 0).toLocaleString()} LKR</span></p>
                    {p.status === "Paid" && p.transactionId && <p className="text-xs text-slate-400 font-mono break-all">{p.transactionId}</p>}
                    {p.status === "Pending" && <PendingBankDetails partner={p.partnerId} />}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setBankModalPartner(p.partnerId || null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        View Bank Info
                      </button>
                      {p.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => handleProcessPayout(p)}
                          disabled={processingPayoutId === p._id}
                          className="py-2.5 px-3 rounded-lg text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                          style={{ backgroundColor: MAROON }}
                        >
                          {processingPayoutId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                          Process Payout
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto max-w-full">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3">Partner</th>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3">Tokens Redeemed</th>
                      <th className="px-4 py-3">Amount (LKR)</th>
                      <th className="px-4 py-3">Available (LKR)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.partnerId?.shopName || p.partnerId?.name || "—"}</p>
                          <p className="text-xs text-slate-400">{p.partnerId?.email}</p>
                          {p.status === "Pending" && <PendingBankDetails partner={p.partnerId} className="mt-1" />}
                        </td>
                        <td className="px-4 py-3">{p.month}</td>
                        <td className="px-4 py-3">{p.totalTokens}</td>
                        <td className="px-4 py-3 font-medium">{p.totalAmount?.toLocaleString()} LKR</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{(p.partnerId?.partnerAvailableBalance ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setBankModalPartner(p.partnerId || null)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              View Bank Info
                            </button>
                            {p.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => handleProcessPayout(p)}
                                disabled={processingPayoutId === p._id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50"
                                style={{ backgroundColor: MAROON }}
                              >
                                {processingPayoutId === p._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                                Process Payout
                              </button>
                            )}
                            {p.status === "Paid" && p.transactionId && <span className="text-xs text-slate-400">{p.transactionId}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payouts.length === 0 && !loadingPayouts && <p className="hidden md:block p-6 text-center text-slate-500">No payouts. Use &quot;Calculate Payouts&quot; for a month.</p>}
            </div>
          </motion.div>
        )}
      </div>

      {/* Route Preview Modal — admin-only; opens from Pending Approvals (route name or View on Map) */}
      {previewRoute && (
        <RoutePreviewModal
          route={previewRoute}
          onClose={() => setPreviewRoute(null)}
          onApprove={handleApproveRoute}
          onReject={handleRejectRoute}
          actioning={actioningRouteId === previewRoute._id}
        />
      )}

      {/* Bank details modal — partner account info for payouts */}
      {bankModalPartner && (
        <BankInfoModal
          partner={bankModalPartner}
          onClose={() => setBankModalPartner(null)}
        />
      )}

      {/* Reject payout request modal — reason required */}
      {rejectModalRequest && (
        <RejectPayoutRequestModal
          requestId={rejectModalRequest.id}
          partnerName={rejectModalRequest.partnerName}
          amount={rejectModalRequest.amount}
          onClose={() => { setRejectModalRequest(null); setRejectingRequestId(null); }}
          onConfirm={async (rejectionReason) => {
            if (!token) return;
            setRejectingRequestId(rejectModalRequest.id);
            try {
              await rejectPayoutRequest(token, rejectModalRequest.id, { rejectionReason });
              setPayoutRequests((prev) =>
                prev.map((x) =>
                  x._id === rejectModalRequest.id
                    ? { ...x, status: "Rejected", rejectionReason }
                    : x
                )
              );
              toast.success("Payout request rejected", { iconTheme: { primary: MAROON } });
              setRejectModalRequest(null);
            } catch (err) {
              toast.error(err.response?.data?.message || "Failed to reject request");
            } finally {
              setRejectingRequestId(null);
            }
          }}
          loading={rejectingRequestId === rejectModalRequest.id}
        />
      )}
    </div>
  );
}
