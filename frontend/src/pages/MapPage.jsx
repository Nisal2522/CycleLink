/**
 * pages/MapPage.jsx
 * --------------------------------------------------
 * Full-screen LiveMap page for the cyclist dashboard.
 *
 * Responsive:
 *   Mobile  — compact header, map accounts for bottom nav (80px)
 *   Desktop — taller map, spacious header
 *
 * Accessible at: /dashboard/map
 * --------------------------------------------------
 */

import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import useAuth from "../hooks/useAuth";
import LiveMap from "../components/LiveMap";

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function MapPage() {
  const location = useLocation();
  const { token, user } = useAuth();
  const [rideMsg, setRideMsg] = useState("");
  const savedRoute = location.state?.savedRoute ?? null;
  const isEditingRoute = location.state?.isEditing === true;

  const handleRideUpdate = useCallback((data) => {
    if (data?.message) {
      setRideMsg(data.message);
      setTimeout(() => setRideMsg(""), 4000);
    }
  }, []);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-2 sm:pb-4 min-h-[100dvh] md:min-h-screen">
      {/* ── Header ── */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible">
        {/* Desktop header */}
        <div className="hidden sm:flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Map</h1>
            <p className="text-sm text-slate-500">
              Click the map to report hazards or plan a route
            </p>
          </div>
        </div>

        {/* Mobile header — compact */}
        <div className="flex sm:hidden items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Live Map</h1>
          </div>
          <p className="text-[11px] text-slate-400 max-w-[140px] text-right leading-tight">
            Tap map to report or route
          </p>
        </div>

        {/* Ride saved notification */}
        {rideMsg && (
          <div className="mb-2 sm:mb-3 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs sm:text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {rideMsg}
          </div>
        )}
      </motion.div>

      {/* ── Map — explicit height for Google Map ── */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
      >
        <div className="h-[calc(100vh-160px)] sm:h-[calc(100vh-140px)] rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.32)] border border-slate-100/80">
          <LiveMap
            key={savedRoute?._id ?? "default"}
            token={token}
            userId={user?._id}
            onRideUpdate={handleRideUpdate}
            initialRoute={savedRoute}
            isEditingRoute={isEditingRoute}
          />
        </div>
      </motion.div>
    </div>
  );
}
