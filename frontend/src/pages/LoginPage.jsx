import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import AuthPage from "../components/AuthPage";
import { getDashboardPath } from "../config/roles";

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Read initial mode and email from URL params
  const initialMode = searchParams.get("mode") || "signin";
  const initialEmail = searchParams.get("email") || "";

  // Where was the user trying to go before being redirected?
  const from = location.state?.from?.pathname;

  // Show message when redirected due to session expiry / invalid token
  useEffect(() => {
    const message = location.state?.message;
    if (message) {
      toast.error(message, { id: "session-expired", duration: 5000 });
    }
  }, [location.state?.message]);

  // If already logged in, redirect to dashboard
  // FIX (2026-02-21): Prevent redirect to previous user's dashboard when switching accounts
  useEffect(() => {
    if (user) {
      const roleDashboard = getDashboardPath(user.role);

      // Only use 'from' path if it's NOT a role-specific dashboard
      // This prevents admin trying to access /dashboard (cyclist only) after login
      const roleDashboards = ["/dashboard", "/partner-dashboard", "/admin-panel"];
      const shouldUseFrom = from && !roleDashboards.includes(from);

      const destination = shouldUseFrom ? from : roleDashboard;
      navigate(destination, { replace: true });
    }
  }, [user, navigate, from]);

  // Navigate back to landing
  const handleBack = () => navigate("/");

  return (
    <AuthPage
      initialMode={initialMode}
      initialEmail={initialEmail}
      onBack={handleBack}
    />
  );
}
