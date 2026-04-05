/**
 * pages/SavedRoutesPage.jsx
 * --------------------------------------------------
 * Community saved routes — list of route cards with
 * Start/End, distance, duration, weather, and "View on Map".
 *
 * Accessible at: /dashboard/routes (Map (Routes) sidebar link)
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  MapPin,
  Route,
  Clock,
  ThermometerSun,
  Map,
  Loader2,
  AlertCircle,
  ExternalLink,
  User,
  Calendar,
  Pencil,
  Trash2,
  TriangleAlert,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { getRoutes, getMyRoutes, deleteRoute, rateRoute, getRouteRatings, deleteRating } from "../services/routeService";
import useAuth from "../hooks/useAuth";

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SavedRoutesPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirmRoute, setDeleteConfirmRoute] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalRoute, setRatingModalRoute] = useState(null);
  const [viewRatingsRoute, setViewRatingsRoute] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loadingRatings, setLoadingRatings] = useState(false);

  // Load approved routes + current user's pending/rejected so status (Live/Pending/Rejected) shows for own routes.
  // Refetch on focus so when admin approves a route, creator sees "Live" without leaving the page.
  const loadRoutes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const approved = await getRoutes().then((d) => (Array.isArray(d) ? d : []));
      if (!token) {
        setRoutes(approved);
        return;
      }
      const myRoutes = await getMyRoutes(token).then((d) => (Array.isArray(d) ? d : []));
      const approvedIds = new Set(approved.map((r) => String(r._id)));
      const myPendingOrRejected = myRoutes.filter((r) => r.status !== "approved" && r.status !== "");
      const combined = [...approved];
      myPendingOrRejected.forEach((r) => {
        if (!approvedIds.has(String(r._id))) combined.push(r);
      });
      combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRoutes(combined);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load routes");
      setRoutes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // When user returns to this tab, refetch so they see status change to "Live" after admin approval.
  useEffect(() => {
    const onFocus = () => loadRoutes(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadRoutes]);

  const handleViewOnMap = (route) => {
    navigate("/dashboard/map", {
      state: {
        savedRoute: route,
        routeId: route._id,
        pathCoordinates: route.path,
      },
    });
  };

  const handleEditRoute = (route) => {
    navigate("/dashboard/map", {
      state: {
        savedRoute: route,
        isEditing: true,
      },
    });
  };

  const handleDeleteClick = (route) => {
    setDeleteConfirmRoute(route);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmRoute || !token) return;
    setDeleting(true);
    try {
      await deleteRoute(token, deleteConfirmRoute._id);
      setRoutes((prev) => prev.filter((r) => r._id !== deleteConfirmRoute._id));
      setDeleteConfirmRoute(null);
      toast.success("Route deleted successfully", {
        style: { background: "#fdf2f8", border: "1px solid #fbcfe8", color: "#80134D" },
        iconTheme: { primary: "#80134D" },
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete route", {
        style: { background: "#fdf2f8", border: "1px solid #fbcfe8", color: "#80134D" },
        iconTheme: { primary: "#80134D" },
      });
    } finally {
      setDeleting(false);
    }
  };

  const isOwnRoute = (route) => {
    const creatorId = route.creatorId?._id ?? route.creatorId;
    return creatorId && user?._id && String(creatorId) === String(user._id);
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved" || s === "") return { label: "Live", className: "bg-emerald-100 text-emerald-700 border-emerald-200", showDot: true };
    if (s === "rejected") return { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200", showDot: false };
    return { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200", showDot: false };
  };

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Route className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Map (Routes)</h1>
                <p className="text-sm text-slate-500">Community saved routes — plan and explore</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadRoutes(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors"
                title="Refresh to see latest status (e.g. Live after approval)"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard/map")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                <Map className="w-4 h-4" />
                Open Live Map
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Error ── */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm mb-6"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm text-slate-500">Loading routes...</p>
          </div>
        ) : routes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Route className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-700 font-semibold mb-1">No routes yet</p>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Save a route from the Live Map to share it with the community.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard/map")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Map className="w-4 h-4" />
              Open Live Map
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {routes.map((route, i) => (
              <motion.article
                key={route._id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.08)] overflow-hidden hover:shadow-[0_14px_40px_rgba(135,16,83,0.12)] hover:border-primary/20 transition-all duration-300"
              >
                {/* Card accent bar — maroon/pink theme */}
                <div className="h-1.5 bg-primary" />

                <div className="p-4 sm:p-5">
                  {/* Status badge — Live = approved & visible to all; Pending = awaiting approval; Rejected = not published */}
                  {isOwnRoute(route) && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusBadge(route.status).className}`}>
                        {getStatusBadge(route.status).showDot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden />}
                        {getStatusBadge(route.status).label}
                      </span>
                    </div>
                  )}
                  {/* Start / End */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0 mt-0.5">
                        A
                      </span>
                      <p className="text-sm text-slate-700 line-clamp-2" title={route.startLocation}>
                        {route.startLocation}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0 mt-0.5">
                        B
                      </span>
                      <p className="text-sm text-slate-700 line-clamp-2" title={route.endLocation}>
                        {route.endLocation}
                      </p>
                    </div>
                  </div>

                  {/* Distance & Duration */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                      <Route className="w-3.5 h-3.5" />
                      {route.distance}
                    </span>
                    {route.duration && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        {route.duration}
                      </span>
                    )}
                  </div>

                  {/* Rating display */}
                  {route.averageRating > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= Math.round(route.averageRating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewRatingsRoute(route);
                          setLoadingRatings(true);
                          getRouteRatings(route._id)
                            .then(setRatings)
                            .catch(() => toast.error("Failed to load ratings"))
                            .finally(() => setLoadingRatings(false));
                        }}
                        className="text-xs text-slate-600 hover:text-primary transition-colors"
                      >
                        {route.averageRating.toFixed(1)} ({route.ratingCount} {route.ratingCount === 1 ? 'rating' : 'ratings'})
                      </button>
                    </div>
                  )}

                  {/* Weather at destination (when saved) */}
                  {route.weatherCondition && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
                      <ThermometerSun className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{route.weatherCondition}</span>
                    </div>
                  )}

                  {/* Meta: creator & date */}
                  <div className="flex items-center justify-between gap-2 mb-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {route.creatorId?.name || "Cyclist"}
                    </span>
                    {route.createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(route.createdAt)}
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit & Delete (owner only) */}
                  {isOwnRoute(route) && (
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => handleEditRoute(route)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(route)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {token && !isOwnRoute(route) && (
                      <button
                        type="button"
                        onClick={() => setRatingModalRoute(route)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-50 text-yellow-700 text-sm font-semibold hover:bg-yellow-100 transition-colors border border-yellow-200"
                      >
                        <Star className="w-4 h-4" />
                        Rate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleViewOnMap(route)}
                      className={`${token && !isOwnRoute(route) ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      View on Map
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {/* Delete confirmation popup */}
        {deleteConfirmRoute && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <TriangleAlert className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Delete route?</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                {deleteConfirmRoute.startLocation} → {deleteConfirmRoute.endLocation}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmRoute(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Rate Route Modal */}
        {ratingModalRoute && (
          <RateRouteModal
            route={ratingModalRoute}
            token={token}
            onClose={() => setRatingModalRoute(null)}
            onSubmit={(updatedRoute) => {
              setRoutes((prev) => prev.map((r) => (r._id === updatedRoute._id ? { ...r, averageRating: updatedRoute.averageRating, ratingCount: updatedRoute.ratingCount } : r)));
              setRatingModalRoute(null);
            }}
          />
        )}

        {/* View Ratings Modal */}
        {viewRatingsRoute && (
          <ViewRatingsModal
            route={viewRatingsRoute}
            ratings={ratings}
            loading={loadingRatings}
            onClose={() => {
              setViewRatingsRoute(null);
              setRatings(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   RateRouteModal Component
   ───────────────────────────────────────────── */
function RateRouteModal({ route, token, onClose, onSubmit }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // NEW STATE for edit mode and delete functionality
  const [existingRating, setExistingRating] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingRating, setLoadingRating] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch user's existing rating on modal open
  useEffect(() => {
    const loadUserRating = async () => {
      setLoadingRating(true);
      try {
        // Fetch all ratings for this route
        const data = await getRouteRatings(route._id);

        // Find current user's rating
        const userRating = data.ratings.find(
          r => String(r.userId?._id) === String(user._id)
        );

        if (userRating) {
          // User has already rated - enter edit mode
          setExistingRating(userRating);
          setIsEditMode(true);
          // Pre-fill form with existing data
          setRating(userRating.rating);
          setComment(userRating.comment || "");
        }
      } catch (err) {
        console.error("Failed to load rating:", err);
        // Continue in create mode if fetch fails
      } finally {
        setLoadingRating(false);
      }
    };

    loadUserRating();
  }, [route._id, user._id]);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const updatedRoute = await rateRoute(token, route._id, { rating, comment });

      // Different success message based on mode
      toast.success(
        isEditMode
          ? "Your rating has been updated!"
          : "Thank you for rating this route!"
      );

      onSubmit(updatedRoute);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteRating(token, route._id);

      // Update parent component's route list
      // Decrement rating count and recalculate average
      const updatedRoute = {
        ...route,
        ratingCount: route.ratingCount - 1,
        // Average recalculation happens on backend, but we can estimate
        averageRating: route.ratingCount > 1
          ? ((route.averageRating * route.ratingCount) - existingRating.rating) / (route.ratingCount - 1)
          : 0
      };

      onSubmit(updatedRoute);
      toast.success("Your rating has been deleted");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete rating");
      setShowDeleteConfirm(false); // Return to form on error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading State */}
        {loadingRating ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading your rating...</p>
          </div>
        ) : showDeleteConfirm ? (
          /* Delete Confirmation Screen */
          <>
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <TriangleAlert className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Delete your rating?
              </h3>

              <p className="text-sm text-slate-600 mb-6">
                This will permanently remove your {existingRating.rating}-star rating
                {existingRating.comment && " and comment"}.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Normal Rating Form */
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isEditMode ? "Update Your Rating" : "Rate This Route"}
                </h3>
                {/* Show existing rating date in edit mode */}
                {isEditMode && existingRating && (
                  <p className="text-xs text-slate-500 mt-1">
                    You rated this on {formatDate(existingRating.createdAt)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              {route.startLocation} → {route.endLocation}
            </p>

            {/* Star rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="ml-2 text-sm font-medium text-slate-600">
                {rating === 0 ? "Select rating" : `${rating} star${rating > 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Share your experience (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you think of this route?"
                className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{comment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    {isEditMode ? "Update Rating" : "Submit Rating"}
                  </>
                )}
              </button>

              {/* Conditional secondary button based on mode */}
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ViewRatingsModal Component
   ───────────────────────────────────────────── */
function ViewRatingsModal({ route, ratings, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl border border-slate-100 p-5 sm:p-6 max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Route Ratings</h3>
            <p className="text-sm text-slate-500 mt-1">
              {route.startLocation} → {route.endLocation}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-slate-500">Loading ratings...</p>
          </div>
        ) : ratings && ratings.ratings.length > 0 ? (
          <>
            {/* Average rating summary */}
            <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{ratings.averageRating.toFixed(1)}</div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= Math.round(ratings.averageRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Based on <span className="font-semibold">{ratings.ratingCount}</span> {ratings.ratingCount === 1 ? 'rating' : 'ratings'}
                </div>
              </div>
            </div>

            {/* Individual ratings */}
            <div className="overflow-y-auto flex-1 -mx-5 sm:-mx-6 px-5 sm:px-6">
              <div className="space-y-4">
                {ratings.ratings.map((r, idx) => (
                  <div key={idx} className="border-b border-slate-100 pb-4 last:border-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{r.userId?.name || "Cyclist"}</p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= r.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-slate-600 mt-2 pl-10">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Star className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No ratings yet</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to rate this route!</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
