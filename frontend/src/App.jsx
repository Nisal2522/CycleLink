/**
 * App.jsx
 * --------------------------------------------------
 * Root application component for CycleLink.
 *
 * Architecture:
 *   BrowserRouter → AuthProvider → App
 *     ├── /                        → LandingPage       (public)
 *     ├── /login                   → LoginPage         (public)
 *     ├── /dashboard               → CyclistDashboard  ─┐
 *     │   ├── /dashboard/map       → MapPage            │
 *     │   ├── /dashboard/rewards   → RewardsPage        ├ DashboardLayout (nested)
 *     │   ├── /dashboard/leaderboard → LeaderboardPage  │
 *     │   └── /dashboard/history   → TripHistoryPage   ─┘
 *     ├── /partner-dashboard       → PartnerDashboard   (DashboardLayout)
 *     ├── /admin-panel             → AdminDashboard     (DashboardLayout)
 *     └── *                        → redirect
 *
 * DashboardLayout uses <Outlet /> so the sidebar remains
 * stable when navigating between sub-pages.
 * --------------------------------------------------
 */

import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AUTH_LOGOUT_EVENT } from "./constants/auth";
import { AnimatePresence } from "framer-motion";

const THEME_STORAGE_KEY = "cycle-theme";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import CyclistDashboard from "./pages/CyclistDashboard";
import MapPage from "./pages/MapPage";
import RewardsPage from "./pages/RewardsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import TripHistoryPage from "./pages/TripHistoryPage";
import WeatherPage from "./pages/WeatherPage";
import PartnerDashboard from "./pages/PartnerDashboard";
import ShopProfile from "./pages/partner/ShopProfile";
import BankSettings from "./pages/partner/BankSettings";
import EarningsPage from "./pages/partner/EarningsPage";
import PartnerScanPage from "./pages/partner/PartnerScanPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRouteOverviewPage from "./pages/AdminRouteOverviewPage";
import RedeemRewardsPage from "./pages/RedeemRewardsPage";
import SavedRoutesPage from "./pages/SavedRoutesPage";
import PaymentPage from "./pages/PaymentPage";
import ChatPage from "./pages/ChatPage";

// Features (RBAC — Requirement iv)
import { ProtectedRoute, UnauthorizedPage } from "./features/auth";
import PageTransition from "./components/PageTransition";
import Sidebar from "./components/Sidebar";
import MobileBottomNav from "./components/MobileBottomNav";
import ChatBot from "./components/ChatBot";

// Context & Hooks
import SidebarProvider from "./context/SidebarContext";
import ChatUnreadProvider from "./context/ChatUnreadContext";
import useSidebar from "./hooks/useSidebar";
import useAuth from "./hooks/useAuth";
import { getDashboardPath } from "./config/roles";

/**
 * DashboardContent
 * Must be inside SidebarProvider to read sidebarWidth.
 * Uses <Outlet /> to render the matched child route.
 */
function DashboardContent() {
  const { sidebarWidth } = useSidebar();

  return (
    <div
      className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
      style={{ "--sidebar-w": `${sidebarWidth}px` }}
    >
      {/* Desktop sidebar (hidden below md via its own CSS) */}
      <Sidebar />

      {/* Main content — left margin matches sidebar on md+, 0 on mobile */}
      <main className="flex-1 min-w-0 max-w-full overflow-x-hidden transition-all duration-300 pb-20 md:pb-0 ml-0 md:ml-[var(--sidebar-w)]">
        <Outlet />
      </main>

      {/* Mobile bottom nav (hidden above md via its own CSS) */}
      <MobileBottomNav />
    </div>
  );
}

/**
 * DashboardLayout
 * Wraps SidebarProvider around the layout so both
 * Sidebar and content margin share the collapsed state.
 */
function DashboardLayout() {
  return (
    <SidebarProvider>
      <ChatUnreadProvider>
        <DashboardContent />
      </ChatUnreadProvider>
    </SidebarProvider>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Apply saved theme to document on mount so dark mode affects all pages immediately
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const root = document.documentElement;
    if (saved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  // Global 401 handling: clear auth and redirect to login with "Session expired"
  useEffect(() => {
    const handleUnauthorized = (e) => {
      const message = e?.detail?.message || "Session expired";
      navigate("/login", { replace: true, state: { message } });
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleUnauthorized);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-colors duration-300">
      <ChatBot />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* ── Public routes ── */}
        <Route
          path="/"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/unauthorized"
          element={
            <PageTransition>
              <UnauthorizedPage />
            </PageTransition>
          }
        />

        {/* ── Cyclist dashboard (Profile, My Rides, etc.) — cyclist only ── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["cyclist"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CyclistDashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="history" element={<TripHistoryPage />} />
          <Route path="weather" element={<WeatherPage />} />
          <Route path="redeem" element={<RedeemRewardsPage />} />
          <Route path="routes" element={<SavedRoutesPage />} />
          <Route path="payment" element={<PaymentPage />} />
          <Route path="messages" element={<ChatPage />} />
        </Route>

        {/* ── Partner dashboard (Scanner, Rewards Management) — partner only ── */}
        <Route
          path="/partner-dashboard"
          element={
            <ProtectedRoute allowedRoles={["partner"]}>
              <PageTransition>
                <SidebarProvider>
                  <ChatUnreadProvider>
                    <DashboardContent />
                  </ChatUnreadProvider>
                </SidebarProvider>
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route index element={<PartnerDashboard />} />
          <Route path="scan" element={<PartnerScanPage />} />
          <Route path="shop-profile" element={<ShopProfile />} />
          <Route path="bank-settings" element={<BankSettings />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="messages" element={<ChatPage />} />
        </Route>

        {/* ── Admin panel ── */}
        <Route
          path="/admin-panel"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <PageTransition>
                <SidebarProvider>
                  <ChatUnreadProvider>
                    <DashboardContent />
                  </ChatUnreadProvider>
                </SidebarProvider>
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="route-overview" element={<AdminRouteOverviewPage />} />
          <Route path="messages" element={<ChatPage />} />
        </Route>

        {/* ── Catch-all ── */}
        <Route
          path="*"
          element={
            <Navigate
              to={user ? getDashboardPath(user.role) : "/"}
              replace
            />
          }
        />
      </Routes>
    </AnimatePresence>
    </div>
  );
}
