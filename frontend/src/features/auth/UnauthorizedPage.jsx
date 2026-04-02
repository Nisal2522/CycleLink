/**
 * features/auth/UnauthorizedPage.jsx
 * --------------------------------------------------
 * Shown when the user is logged in but their role cannot access the route (RBAC).
 * --------------------------------------------------
 */

import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { getDashboardPath } from "../../config/roles";

export default function UnauthorizedPage() {
  const location = useLocation();
  const role = location.state?.role;
  const dashboardPath = role ? getDashboardPath(role) : "/dashboard";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Access denied
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          You don’t have permission to view this page. Go back to your dashboard or log in with a different account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={dashboardPath}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            My dashboard
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
