import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";
import {
  Bike,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  Leaf,
  Quote,
  Store,
  ShieldCheck,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getDashboardPath } from "../config/roles";
import { USER_KEY } from "../constants/auth";
import { getAuthStats } from "../services/authService";
import {
  validateSignUpForm,
  validateSignInForm,
  hasErrors,
} from "../utils/validators";

/** Format count for display (e.g. 1234 → "1,234", 52000 → "52k") */
function formatUserCount(n) {
  if (n == null || typeof n !== "number" || n < 0) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

/* ── Brand SVG icons ── */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

/* ── Stagger animation helpers ── */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function AuthPage({
  initialMode = "signin",
  initialEmail = "",
  onBack,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  // ── Auth context (global state) ──
  const { loading, error, register, login, loginWithGoogle, clearError } = useAuth();

  // Loading overlay while backend verifies Google token
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);
  // Total users from API (users table) for "Join X+ Urban Riders"
  const [totalUsers, setTotalUsers] = useState(null);

  useEffect(() => {
    getAuthStats()
      .then((data) => setTotalUsers(data?.totalUsers ?? null))
      .catch(() => setTotalUsers(null));
  }, []);

  // ── Local UI state ──
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [touched, setTouched] = useState({});      // tracks which fields user has interacted with
  const [fieldErrors, setFieldErrors] = useState({}); // per-field validation errors
  const [selectedRole, setSelectedRole] = useState("cyclist");
  const [formData, setFormData] = useState({
    name: "",
    email: initialEmail,
    password: "",
  });

  // Redirect after success: read user from localStorage (saved synchronously by saveSession) so we don't rely on context update timing
  // FIX (2026-02-21): Always redirect to role-based dashboard after login to prevent
  // attempting to access previous user's dashboard with different role
  const fromPath = location.state?.from?.pathname;
  useEffect(() => {
    if (!success) return;
    let storedUser = null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      storedUser = raw ? JSON.parse(raw) : null;
    } catch {
      /* ignore */
    }
    if (!storedUser?.role) return;

    // Get role-based dashboard
    const roleDashboard = getDashboardPath(storedUser.role);

    // Only use fromPath if it's NOT a role-specific dashboard
    // This prevents admin trying to access /dashboard (cyclist only) after login
    const roleDashboards = ["/dashboard", "/partner-dashboard", "/admin-panel"];
    const shouldUseFromPath = fromPath && !roleDashboards.includes(fromPath);

    const destination = shouldUseFromPath ? fromPath : roleDashboard;
    navigate(destination, { replace: true });
  }, [success, fromPath, navigate]);

  // Sync props when they change
  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    if (initialEmail) setFormData((p) => ({ ...p, email: initialEmail }));
  }, [initialEmail]);

  // Clear errors, banners, and touched state on mode toggle
  useEffect(() => {
    clearError();
    setSuccess("");
    setFieldErrors({});
    setTouched({});
  }, [mode, clearError]);

  const toggleMode = () => setMode(mode === "signin" ? "signup" : "signin");

  // Handle input changes + live validation for touched fields
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear server error when user starts typing again
      if (error) clearError();
    },
    [error, clearError]
  );

  // Mark field as touched on blur + validate
  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));

      // Run validation for this field
      const errors =
        mode === "signup"
          ? validateSignUpForm(formData)
          : validateSignInForm(formData);

      setFieldErrors((prev) => ({ ...prev, [name]: errors[name] || "" }));
    },
    [formData, mode]
  );

  // Submit form — validate first, then delegate to AuthContext
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");

    // Run full validation
    const errors =
      mode === "signup"
        ? validateSignUpForm(formData)
        : validateSignInForm(formData);

    // Mark all fields as touched to show errors
    const allTouched = Object.keys(errors).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);
    setFieldErrors(errors);

    // Stop if validation fails
    if (hasErrors(errors)) return;

    // Proceed with API call
    let ok = false;

    if (mode === "signup") {
      ok = await register(formData.name, formData.email, formData.password, selectedRole);
    } else {
      ok = await login(formData.email, formData.password);
    }

    if (ok) {
      setSuccess(
        mode === "signup"
          ? "Account created! Redirecting to your dashboard..."
          : "Welcome back! Redirecting..."
      );
      // LoginPage's useEffect will detect the user state change
      // and redirect to the appropriate role-based dashboard.
    }
  };

  // Helper — get the error message for a field (only if touched)
  const getFieldError = (field) =>
    touched[field] && fieldErrors[field] ? fieldErrors[field] : "";

  const isSignUp = mode === "signup";

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      const credential = credentialResponse?.credential;
      if (!credential) {
        toast.error("Google sign-in did not return a credential. Please try again.");
        return;
      }
      setGoogleAuthLoading(true);
      clearError();
      try {
        const ok = await loginWithGoogle(credential);
        if (ok) {
          toast.success("Signed in with Google. Redirecting…");
          setSuccess("Signed in with Google. Redirecting…");
        } else {
          toast.error("Google sign-in failed. Please try again.");
        }
      } catch {
        toast.error("Google sign-in failed. Please try again.");
      } finally {
        setGoogleAuthLoading(false);
      }
    },
    [loginWithGoogle, clearError, navigate]
  );

  const handleGoogleError = useCallback(() => {
    toast.error("Google sign-in was cancelled or failed. Please try again.");
  }, []);

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden font-sans antialiased relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Loading overlay while backend verifies Google token */}
      <AnimatePresence>
        {googleAuthLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white dark:bg-slate-800 px-8 py-6 shadow-xl">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Verifying your Google account…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ═══════════════════════════════════════════════
          LEFT PANEL — Visual (hidden on mobile)
         ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary to-primary-600" />

        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Decorative blobs */}
        <div className="absolute top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-10 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Top — Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              CycleLink
            </span>
          </motion.div>

          {/* Center — Quote & Cyclist visual */}
          <div className="flex-1 flex flex-col justify-center py-12">
            {/* Cyclist illustration placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative mb-12"
            >
              <div className="w-full aspect-[4/3] rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden flex items-center justify-center">
                {/* Stylised cyclist silhouette using layered shapes */}
                <div className="relative">
                  <div className="w-40 h-40 rounded-full bg-primary-300/20 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-primary-200/20 flex items-center justify-center">
                      <Bike className="w-16 h-16 text-white/80" />
                    </div>
                  </div>
                  {/* Floating stat cards */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="absolute -left-16 top-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/10"
                  >
                    <Shield className="w-4 h-4 text-primary-200" />
                    <span className="text-xs font-semibold text-white">
                      Safe Routes
                    </span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                    className="absolute -right-14 bottom-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/10"
                  >
                    <Leaf className="w-4 h-4 text-primary-200" />
                    <span className="text-xs font-semibold text-white">
                      Eco Tokens
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Quote className="w-8 h-8 text-primary-200/50 mb-4" />
              <blockquote className="text-2xl xl:text-3xl font-bold text-white leading-snug tracking-tight">
                The best routes are the ones you take together.
              </blockquote>
              <p className="mt-4 text-primary-100/70 text-sm leading-relaxed max-w-sm">
                Join a community of cyclists making cities safer, cleaner, and
                more connected — one pedal stroke at a time.
              </p>
            </motion.div>
          </div>

          {/* Bottom — Community badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-3"
          >
            {/* Stacked avatars */}
            <div className="flex -space-x-2.5">
              {["bg-primary-400", "bg-primary-300", "bg-primary-200", "bg-white/30"].map(
                (bg, i) => (
                  <div
                    key={i}
                    className={`w-9 h-9 rounded-full ${bg} border-2 border-primary-800 flex items-center justify-center`}
                  >
                    <Users className="w-3.5 h-3.5 text-white" />
                  </div>
                )
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Join {totalUsers != null ? `${formatUserCount(totalUsers)}+` : "5,000+"} Urban Riders
              </p>
              <p className="text-xs text-primary-200/70">
                Making cities greener together
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════
          RIGHT PANEL — Auth Form
         ═══════════════════════════════════════════════ */}
      <div className="w-full max-w-full lg:w-1/2 flex flex-col min-h-screen overflow-x-hidden bg-[#fdfdfd] dark:bg-slate-900 transition-colors">
        {/* ── Top bar: Back button ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 sm:p-6"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </motion.div>

        {/* ── Form area — aligned to top ── */}
        <div className="flex-1 flex items-start justify-center px-6 sm:px-12 xl:px-20 pt-0 sm:pt-1 pb-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="w-full max-w-[420px]"
          >
            {/* Logo */}
            <motion.div variants={fadeUp} className="flex items-center gap-2.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center shadow-lg shadow-primary/20">
                <Bike className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Cycle<span className="text-primary">Link</span>
              </span>
            </motion.div>

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <motion.h1
                  variants={fadeUp}
                  className="text-3xl sm:text-[2rem] font-extrabold text-slate-900 dark:text-white tracking-tight"
                >
                  {isSignUp ? "Join the Movement" : "Welcome Back"}
                </motion.h1>
                <motion.p variants={fadeUp} className="mt-2 text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
                  {isSignUp
                    ? "Create your account and start earning green rewards."
                    : "Enter your details to continue your green journey."}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            {/* ── Error / Success ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 mt-6"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 mt-6"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Social buttons ── */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 mt-5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                render={(renderProps) => (
                  <button
                    type="button"
                    onClick={renderProps.onClick}
                    disabled={renderProps.disabled || googleAuthLoading}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed w-full"
                  >
                    <GoogleIcon />
                    {typeof renderProps.text === "string" ? renderProps.text : "Sign in with Google"}
                  </button>
                )}
              />
              <button
                type="button"
                className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-all active:scale-[0.97]"
              >
                <AppleIcon />
                Apple
              </button>
            </motion.div>

            {/* ── Divider ── */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                or continue with email
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-600" />
            </motion.div>

            {/* ── Form ── */}
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Name (sign-up only) */}
                {isSignUp && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-name"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${getFieldError("name") ? "text-red-400" : "text-slate-400"}`} />
                      <input
                        id="auth-name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="John Doe"
                        aria-invalid={!!getFieldError("name")}
                        aria-describedby={getFieldError("name") ? "name-error" : undefined}
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 transition-all ${
                          getFieldError("name")
                            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                            : "border-slate-200 focus:ring-primary/25 focus:border-primary"
                        }`}
                      />
                    </div>
                    {getFieldError("name") && (
                      <p id="name-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {getFieldError("name")}
                      </p>
                    )}
                  </div>
                )}

                {/* Role selector (sign-up only) */}
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      I am a...
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "cyclist", label: "Cyclist", icon: Bike },
                        { value: "partner", label: "Partner", icon: Store },
                        { value: "admin", label: "Admin", icon: ShieldCheck },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSelectedRole(opt.value)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                            selectedRole === opt.value
                              ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                              : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <opt.icon className="w-5 h-5" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${getFieldError("email") ? "text-red-400" : "text-slate-400"}`} />
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="you@example.com"
                      aria-invalid={!!getFieldError("email")}
                      aria-describedby={getFieldError("email") ? "email-error" : undefined}
                      className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 transition-all ${
                        getFieldError("email")
                          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                          : "border-slate-200 focus:ring-primary/25 focus:border-primary"
                      }`}
                    />
                  </div>
                  {getFieldError("email") && (
                    <p id="email-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {getFieldError("email")}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary hover:text-primary-400 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${getFieldError("password") ? "text-red-400" : "text-slate-400"}`} />
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder={
                        isSignUp ? "Min. 8 characters" : "Enter your password"
                      }
                      aria-invalid={!!getFieldError("password")}
                      aria-describedby={getFieldError("password") ? "password-error" : undefined}
                      className={`w-full pl-11 pr-12 py-3.5 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                        getFieldError("password")
                          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                          : "border-slate-200 dark:border-slate-600 focus:ring-primary/25 focus:border-primary"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                  {getFieldError("password") && (
                    <p id="password-error" className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {getFieldError("password")}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !!success || (Object.keys(touched).length > 0 && hasErrors(fieldErrors))}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/25 hover:bg-primary-600 hover:shadow-primary/35 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isSignUp ? "Creating Account..." : "Signing In..."}
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Success!
                    </>
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>

            {/* ── Toggle mode ── */}
            <motion.p
              variants={fadeUp}
              className="mt-8 text-center text-sm text-slate-500"
            >
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-primary hover:text-primary-400 transition-colors"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </motion.p>

            {/* ── Terms ── */}
            <motion.p
              variants={fadeUp}
              className="mt-5 text-center text-[11px] text-slate-400 leading-relaxed"
            >
              By continuing you agree to our{" "}
              <a href="#" className="underline hover:text-slate-600">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-slate-600">
                Privacy Policy
              </a>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
