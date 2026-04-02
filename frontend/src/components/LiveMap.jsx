/**
 * LiveMap.jsx
 * --------------------------------------------------
 * Interactive cycling map built with Google Maps JavaScript API (@react-google-maps/api).
 *
 * Features:
 *   1. Live GPS tracking — watchPosition with cycling icon marker
 *   2. First-load centering only — then user can pan freely
 *   3. Hazard markers — fetched via React Query (TanStack) with caching
 *   4. Loading skeleton overlay while data loads
 *   5. Click-to-report — click the map → popup → POST to backend
 *   6. Edit / Delete — inline popup UI for own hazards (owner only)
 *   7. Route drawing — click a target → green polyline (OSRM API)
 *   8. Distance tracking — haversine calculation, save to backend
 *   9. Toast notification when GPS is denied
 *  10. Manual route: Start/End search (Nominatim), OSRM route, distance + time
 *  11. Real-time weather at destination (Open-Meteo), weather card + marker
 *
 * Requires: VITE_GOOGLE_MAPS_API_KEY in .env
 * --------------------------------------------------
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  InfoWindow,
  Polyline,
} from "@react-google-maps/api";
import toast from "react-hot-toast";
import {
  getHazardMarkers,
  reportHazard,
  updateHazard,
  deleteHazard,
} from "../services/hazardService";
import {
  updateDistance,
  startRide,
  endRide,
  getActiveRide,
  cancelRide,
} from "../services/cyclistService";
import { saveRoute, updateRoute } from "../services/routeService";
import {
  AlertTriangle,
  Navigation,
  Loader2,
  X,
  Send,
  Bike,
  Pencil,
  Trash2,
  Check,
  TriangleAlert,
  MapPin,
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
  ThermometerSun,
  CheckCircle,
  Flag,
} from "lucide-react";

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 };
const MAP_CONTAINER = {
  width: "100%",
  height: "100%",
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/* ──────────────────────────────────────────────
   Custom marker SVG icons (data URLs for Google Maps)
   ────────────────────────────────────────────── */

/* Cycling icon — magenta circle with white bicycle inside */
const cyclistIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="28" height="28">
  <circle cx="24" cy="24" r="22" fill="#871053" stroke="white" stroke-width="2"/>
  <g fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="15" cy="29" r="5.5"/>
    <circle cx="33" cy="29" r="5.5"/>
    <polyline points="15,29 21,18 27,18 33,29"/>
    <line x1="21" y1="18" x2="19" y2="13"/>
    <line x1="17" y1="13" x2="21" y2="13"/>
    <line x1="27" y1="18" x2="29" y2="13"/>
    <line x1="29" y1="13" x2="33" y2="13"/>
  </g>
</svg>`;

const hazardIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="28" height="28">
  <circle cx="18" cy="18" r="16" fill="#ef4444" stroke="white" stroke-width="2"/>
  <text x="18" y="24" text-anchor="middle" fill="white" font-size="20" font-weight="bold">!</text>
</svg>`;

const ownHazardIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="32" height="32">
  <circle cx="22" cy="22" r="16" fill="#871053" stroke="white" stroke-width="2"/>
  <text x="22" y="28" text-anchor="middle" fill="white" font-size="20" font-weight="bold">!</text>
</svg>`;

const targetIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="28" height="28">
  <circle cx="18" cy="18" r="16" fill="#10b981" stroke="white" stroke-width="2"/>
  <circle cx="18" cy="18" r="6" fill="white"/>
  <circle cx="18" cy="18" r="3" fill="#10b981"/>
</svg>`;

/* Start location — maroon circle with "A" */
const startIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="28" height="28">
  <circle cx="18" cy="18" r="16" fill="#871053" stroke="white" stroke-width="2"/>
  <text x="18" y="24" text-anchor="middle" fill="white" font-size="16" font-weight="bold">A</text>
</svg>`;

/* End location — green circle with "B" (alternative to target icon for manual route) */
const endIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="28" height="28">
  <circle cx="18" cy="18" r="16" fill="#059669" stroke="white" stroke-width="2"/>
  <text x="18" y="24" text-anchor="middle" fill="white" font-size="16" font-weight="bold">B</text>
</svg>`;

function svgToDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim().replace(/\s+/g, " "))}`;
}

/* Icon URLs — passed directly to Marker icon prop as strings */
const CYCLIST_ICON = svgToDataUrl(cyclistIconSvg);
const HAZARD_ICON = svgToDataUrl(hazardIconSvg);
const OWN_HAZARD_ICON = svgToDataUrl(ownHazardIconSvg);
const TARGET_ICON = svgToDataUrl(targetIconSvg);
const START_ICON = svgToDataUrl(startIconSvg);
const END_ICON = svgToDataUrl(endIconSvg);

/* ──────────────────────────────────────────────
   Haversine distance calculation
   ────────────────────────────────────────────── */

function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h > 0) return `${h} h ${mins} min`;
  return `${m} min`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Total distance in km along path (sum of haversine segments) — keeps distance in sync with drawn route */
function pathDistanceKm(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const lat1 = typeof a.lat === "number" ? a.lat : Number(a.lat);
    const lng1 = typeof a.lng === "number" ? a.lng : Number(a.lng);
    const lat2 = typeof b.lat === "number" ? b.lat : Number(b.lat);
    const lng2 = typeof b.lng === "number" ? b.lng : Number(b.lng);
    if (Number.isNaN(lat1) || Number.isNaN(lng1) || Number.isNaN(lat2) || Number.isNaN(lng2)) continue;
    total += haversineKm(lat1, lng1, lat2, lng2);
  }
  return Math.round(total * 100) / 100;
}

/* ──────────────────────────────────────────────
   WMO weather code → icon + label (Open-Meteo)
   ────────────────────────────────────────────── */
function weatherFromCode(code) {
  if (code === 0) return { label: "Clear", Icon: Sun, tip: "Great for cycling" };
  if (code === 1 || code === 2) return { label: "Partly cloudy", Icon: Cloud, tip: "Good conditions" };
  if (code === 3) return { label: "Overcast", Icon: Cloud, tip: "Comfortable ride" };
  if (code === 45 || code === 48) return { label: "Foggy", Icon: CloudFog, tip: "Reduce speed, use lights" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", Icon: CloudDrizzle, tip: "Slippery roads — be careful" };
  if (code >= 61 && code <= 67) return { label: "Rain", Icon: CloudRain, tip: "Be careful while cycling" };
  if (code >= 71 && code <= 77) return { label: "Snow", Icon: CloudSnow, tip: "Avoid cycling if possible" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", Icon: CloudRain, tip: "Be careful while cycling" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", Icon: CloudSnow, tip: "Avoid cycling if possible" };
  if (code >= 95) return { label: "Thunderstorm", Icon: CloudLightning, tip: "Do not cycle — seek shelter" };
  return { label: "Unknown", Icon: ThermometerSun, tip: "Check conditions" };
}

/* ──────────────────────────────────────────────
   Location search input (Nominatim autocomplete)
   ────────────────────────────────────────────── */
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/** Reverse geocode (lat, lng) to a display name. Returns short label or null. */
async function reverseGeocode(lat, lng) {
  try {
    const { data } = await axios.get(NOMINATIM_REVERSE_URL, {
      params: { lat, lon: lng, format: "json" },
      headers: { "User-Agent": "CycleLink-App" },
      timeout: 5000,
    });
    const name = data?.address?.road || data?.address?.suburb || data?.address?.neighbourhood || data?.address?.village || data?.address?.town || data?.address?.city || data?.name || data?.display_name?.split(",")[0];
    return name?.trim() || null;
  } catch {
    return null;
  }
}

function LocationSearchInput({
  placeholder,
  value,
  onChange,
  suggestions,
  onSelect,
  loading,
  showDropdown,
  onFocus,
  onBlur,
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={() => setTimeout(onBlur, 200)}
        className="w-full bg-white/80 backdrop-blur-sm border border-white/40 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
      />
      {loading && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        </span>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-0.5 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-lg shadow-xl py-1 z-[1100] max-h-40 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={`${s.lat}-${s.lng}`}
              className="px-3 py-2 text-xs text-slate-700 hover:bg-primary/10 cursor-pointer flex items-center gap-2"
              onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
            >
              <MapPin className="w-3 h-3 text-primary shrink-0" />
              <span className="truncate">{s.display_name || s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Hazard type options
   ────────────────────────────────────────────── */
const HAZARD_OPTIONS = [
  { value: "pothole", label: "Pothole" },
  { value: "construction", label: "Construction" },
  { value: "accident", label: "Accident" },
  { value: "flooding", label: "Flooding" },
  { value: "other", label: "Other" },
];

/* ──────────────────────────────────────────────
   Loading skeleton overlay
   ────────────────────────────────────────────── */

function MapLoadingSkeleton({ message }) {
  return (
    <div className="absolute inset-0 z-[999] bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl pointer-events-none">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   HazardPopupContent — view / edit / confirmDelete
   All buttons use e.stopPropagation() to prevent
   the map click handler from firing underneath.
   ────────────────────────────────────────────── */

function HazardPopupContent({ hazard, isOwn, token, userId, onUpdate, onDelete }) {
  const [mode, setMode] = useState("view");
  const [editType, setEditType] = useState(hazard.type);
  const [editDesc, setEditDesc] = useState(hazard.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [userVerification, setUserVerification] = useState(null);

  useEffect(() => {
    // Check if current user has already verified this hazard
    const myVerification = hazard.verifications?.find(
      v => String(v.userId?._id || v.userId) === String(userId)
    );
    setUserVerification(myVerification);
  }, [hazard, userId]);

  const stop = (e) => e?.stopPropagation?.();

  const openEdit = (e) => {
    stop(e);
    setEditType(hazard.type);
    setEditDesc(hazard.description || "");
    setErrorMsg("");
    setMode("edit");
  };

  const handleUpdate = async (e) => {
    stop(e);
    setSaving(true);
    setErrorMsg("");
    try {
      const updated = await updateHazard(token, hazard._id, {
        type: editType,
        description: editDesc,
      });
      onUpdate(updated);
      setMode("view");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    stop(e);
    setDeleting(true);
    setErrorMsg("");
    try {
      await deleteHazard(token, hazard._id);
      onDelete(hazard._id);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete");
      setDeleting(false);
    }
  };

  const handleVerify = async (status) => {
    setVerifying(true);
    try {
      const response = await axios.post(
        `/api/hazards/${hazard._id}/verify`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdate(response.data);
      toast.success(
        status === "exists" ? "Marked as still exists" :
        status === "resolved" ? "Marked as resolved" :
        "Reported as spam"
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify");
    } finally {
      setVerifying(false);
    }
  };

  /* ── View mode ── */
  if (mode === "view") {
    return (
      <div className="min-w-[180px] p-1" onClick={stop}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`inline-block w-2 h-2 rounded-full ${isOwn ? "bg-[#871053]" : "bg-red-500"}`} />
          <strong className={`capitalize text-sm ${isOwn ? "text-[#871053]" : "text-red-600"}`}>{hazard.type}</strong>
          {isOwn && (
            <span className="text-[9px] font-bold uppercase bg-[#871053]/10 text-[#871053] px-1.5 py-0.5 rounded ml-auto">Yours</span>
          )}
        </div>

        {/* Status badge */}
        {hazard.status && hazard.status !== "reported" && (
          <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 inline-block ${
            hazard.status === "verified" ? "bg-blue-100 text-blue-700" :
            hazard.status === "resolved" ? "bg-green-100 text-green-700" :
            hazard.status === "invalid" ? "bg-red-100 text-red-700" :
            "bg-slate-100 text-slate-600"
          }`}>
            {hazard.status}
          </div>
        )}

        {hazard.description && <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">{hazard.description}</p>}
        <p className="text-[10px] text-slate-400">By {hazard.reportedBy?.name || "Unknown"}</p>

        {/* Verification counts */}
        {(hazard.existsCount > 0 || hazard.resolvedCount > 0) && (
          <div className="text-[10px] text-slate-500 mb-1.5">
            {hazard.existsCount > 0 && <span>✓ {hazard.existsCount} confirmed</span>}
            {hazard.resolvedCount > 0 && <span className="ml-2">✓ {hazard.resolvedCount} resolved</span>}
          </div>
        )}

        {/* Owner actions (Edit/Delete) */}
        {isOwn && (
          <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={openEdit} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button type="button" onClick={(e) => { stop(e); setMode("confirmDelete"); }} className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}

        {/* Community validation (for non-owners) */}
        {!isOwn && hazard.status !== "resolved" && hazard.status !== "invalid" && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-500 mb-1.5">
              {userVerification ? "You marked this as:" : "Is this hazard accurate?"}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={(e) => { stop(e); handleVerify("exists"); }}
                disabled={verifying}
                className={`flex-1 flex items-center justify-center gap-0.5 text-[10px] font-semibold py-1.5 rounded-md transition-colors ${
                  userVerification?.status === "exists"
                    ? "bg-green-500 text-white"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                <Check className="w-3 h-3" /> Still exists
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); handleVerify("resolved"); }}
                disabled={verifying}
                className={`flex-1 flex items-center justify-center gap-0.5 text-[10px] font-semibold py-1.5 rounded-md transition-colors ${
                  userVerification?.status === "resolved"
                    ? "bg-blue-500 text-white"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                <CheckCircle className="w-3 h-3" /> Resolved
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); handleVerify("spam"); }}
                disabled={verifying}
                className={`px-2 flex items-center justify-center text-[10px] font-semibold py-1.5 rounded-md transition-colors ${
                  userVerification?.status === "spam"
                    ? "bg-red-500 text-white"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
                title="Report as spam"
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Edit mode ── */
  if (mode === "edit") {
    return (
      <div className="min-w-[210px] p-1" onClick={stop}>
        <p className="font-bold text-sm mb-2 text-slate-800 flex items-center gap-1">
          <Pencil className="w-3.5 h-3.5 text-blue-500" /> Edit Hazard
        </p>
        <select
          value={editType}
          onChange={(e) => setEditType(e.target.value)}
          onClick={stop}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2 focus:ring-1 focus:ring-blue-300 outline-none"
        >
          {HAZARD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Description"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          onClick={stop}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2 focus:ring-1 focus:ring-blue-300 outline-none"
          maxLength={200}
        />
        {errorMsg && <p className="text-[10px] text-red-500 mb-1.5">{errorMsg}</p>}
        <div className="flex gap-1.5">
          <button type="button" onClick={handleUpdate} disabled={saving} className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
          </button>
          <button type="button" onClick={(e) => { stop(e); setMode("view"); }} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  /* ── Confirm-delete mode ── */
  if (mode === "confirmDelete") {
    return (
      <div className="min-w-[210px] p-1" onClick={stop}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <TriangleAlert className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Delete Report?</p>
            <p className="text-[10px] text-slate-500">This action cannot be undone.</p>
          </div>
        </div>
        {errorMsg && <p className="text-[10px] text-red-500 mb-1.5">{errorMsg}</p>}
        <div className="flex gap-1.5">
          <button type="button" onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Yes, Delete
          </button>
          <button type="button" onClick={(e) => { stop(e); setMode("view"); }} className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════
   Main LiveMap component
   ══════════════════════════════════════════════ */

export default function LiveMap({ token, userId, onRideUpdate, initialRoute, isEditingRoute }) {
  const navigate = useNavigate();

  /* ── GPS state ── */
  const [userPos, setUserPos] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(true);

  /* ── Hazards state (simple useEffect fetch with local cache) ── */
  const [hazards, setHazards] = useState([]);
  const [hazardsLoading, setHazardsLoading] = useState(true);

  /* ── Report flow ── */
  const [clickedPos, setClickedPos] = useState(null);
  const [reportType, setReportType] = useState("pothole");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting, setReporting] = useState(false);

  /* ── Route flow ── */
  const [routeCoords, setRouteCoords] = useState([]);
  const [targetPos, setTargetPos] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null); // seconds
  const [routeDurationText, setRouteDurationText] = useState(""); // e.g. "1 h 55 min" from saved route
  const [savedWeatherCondition, setSavedWeatherCondition] = useState(""); // weather when route was saved (for View on Map)
  const [routeNeedsRecalc, setRouteNeedsRecalc] = useState(false); // track if route changed but hasn't recalculated yet

  /* ── Manual route (Start / End search) ── */
  const [startPlace, setStartPlace] = useState(null);
  const [endPlace, setEndPlace] = useState(null);
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [startSearching, setStartSearching] = useState(false);
  const [endSearching, setEndSearching] = useState(false);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);

  /* ── Weather at destination ── */
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  /* ── Save route to community ── */
  const [savingRoute, setSavingRoute] = useState(false);

  /* ── Active ride tracking ── */
  const [activeRide, setActiveRide] = useState(null);
  const [loadingActiveRide, setLoadingActiveRide] = useState(true);

  /* ── Refs ── */
  const nominatimDebounceRef = useRef(null);
  const prevPosRef = useRef(null);
  const sessionDistRef = useRef(0);
  const activeRideRef = useRef(null);
  const mapRef = useRef(null);
  const mapModeRef = useRef("route");
  const userPosRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const startPlaceRef = useRef(null);
  const endPlaceRef = useRef(null);
  const appliedSavedRouteRef = useRef(false);

  const [mapMode, setMapMode] = useState("route");

  /* ── InfoWindow selection ── */
  const [selectedUser, setSelectedUser] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(false);

  /* ── Google Maps loader ── */
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    id: "cycle-google-map",
  });

  /* ── Keep refs in sync for the map click handler ── */
  useEffect(() => { mapModeRef.current = mapMode; }, [mapMode]);
  useEffect(() => { userPosRef.current = userPos; }, [userPos]);
  useEffect(() => { startPlaceRef.current = startPlace; }, [startPlace]);
  useEffect(() => { endPlaceRef.current = endPlace; }, [endPlace]);

  /* ── Apply saved route from "View on Map" (Map (Routes) page) ── */
  useEffect(() => {
    const rawPath = initialRoute?.path || initialRoute?.pathCoordinates;
    if (!rawPath || !Array.isArray(rawPath) || rawPath.length < 2) return;
    const path = rawPath.map((p) => ({
      lat: typeof p.lat === "number" ? p.lat : Number(p.lat),
      lng: typeof p.lng === "number" ? p.lng : Number(p.lng),
    })).filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
    if (path.length < 2) return;

    // Clear any existing route first
    setRouteCoords([]);
    setTargetPos(null);

    // Then set the new route (triggers re-render)
    setTimeout(() => {
      setRouteCoords(path);
      setStartPlace({
        lat: path[0].lat,
        lng: path[0].lng,
        label: initialRoute.startLocation || "Start",
      });
      setEndPlace({
        lat: path[path.length - 1].lat,
        lng: path[path.length - 1].lng,
        label: initialRoute.endLocation || "End",
      });
      setStartQuery(initialRoute.startLocation || "");
      setEndQuery(initialRoute.endLocation || "");
      const distNum = typeof initialRoute.distance === "string"
        ? parseFloat(initialRoute.distance.replace(/[^\d.]/g, "")) || null
        : initialRoute.distance;
      setRouteDistance(distNum);
      setRouteDuration(null);
      setRouteDurationText(initialRoute.duration || "");
      setSavedWeatherCondition(initialRoute.weatherCondition || "");
      appliedSavedRouteRef.current = true;
    }, 100);

    // Fit bounds to show full path
    setTimeout(() => {
      if (mapRef.current && path.length && typeof window !== "undefined" && window.google?.maps?.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 48);
      }
    }, 300);
  }, [initialRoute]);

  /* Fit bounds when map becomes ready and we have a saved route */
  useEffect(() => {
    const rawPath = initialRoute?.path || initialRoute?.pathCoordinates;
    if (!rawPath?.length || !mapRef.current || !window.google?.maps?.LatLngBounds) return;
    const bounds = new window.google.maps.LatLngBounds();
    rawPath.forEach((p) => bounds.extend({ lat: Number(p.lat), lng: Number(p.lng) }));
    mapRef.current.fitBounds(bounds, 48);
  }, [initialRoute, isLoaded]);

  /* Auto-update distance from the drawn path so update uses path + distance + weather in sync */
  useEffect(() => {
    if (routeCoords.length < 2) return;
    const dist = pathDistanceKm(routeCoords);
    if (dist != null) setRouteDistance(dist);
  }, [routeCoords]);

  /* Keep activeRideRef in sync so the GPS watcher ([] deps) can read it */
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  /* ────────────────────────────────────────────
     1. GPS tracking — watchPosition + toast on denial
     ──────────────────────────────────────────── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setGpsLoading(false);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(newPos);
        setGpsLoading(false);
        setGpsError("");

        if (activeRideRef.current && prevPosRef.current) {
          const dist = haversineKm(
            prevPosRef.current[0], prevPosRef.current[1],
            newPos[0], newPos[1],
          );
          if (dist > 0.005) sessionDistRef.current += dist;
        }
        prevPosRef.current = activeRideRef.current ? newPos : null;

        /* Center the map only on the FIRST GPS fix */
        if (!hasCenteredRef.current && mapRef.current) {
          mapRef.current.panTo({ lat: newPos[0], lng: newPos[1] });
          hasCenteredRef.current = true;
        }
      },
      (err) => {
        const msg =
          err.code === 1
            ? "Please enable location to see your position on the map."
            : "Unable to determine your location.";
        setGpsError(msg);
        setGpsLoading(false);
        setUserPos([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
        if (err.code === 1) toast.error(msg, { id: "gps-denied", icon: "📍" });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  /* ────────────────────────────────────────────
     2. Fetch hazards — simple useEffect + setState
        Cached in local state; survives re-renders.
     ──────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.log("[LiveMap] Fetching hazard markers...");
        const data = await getHazardMarkers();
        if (cancelled) return;
        console.log(`[LiveMap] Received ${data.length} hazard(s):`, data);
        if (data.length === 0) console.warn("[LiveMap] No hazards found in database");
        setHazards(data);
      } catch (err) {
        console.error("[LiveMap] Failed to fetch hazards:", err);
        if (!cancelled) toast.error("Failed to load hazards");
      } finally {
        if (!cancelled) setHazardsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ────────────────────────────────────────────
     Fetch active ride on mount
     ──────────────────────────────────────────── */
  useEffect(() => {
    if (!token) {
      setLoadingActiveRide(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const ride = await getActiveRide(token);
        if (cancelled) return;
        setActiveRide(ride);
      } catch (err) {
        console.error("[LiveMap] Failed to fetch active ride:", err);
      } finally {
        if (!cancelled) setLoadingActiveRide(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  /* ────────────────────────────────────────────
     3. Map click — reads refs so the handler
        always sees current state
     ──────────────────────────────────────────── */
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;

    /* If we have a saved route (View on Map), fit bounds to show full path */
    const savedPath = initialRoute?.path || initialRoute?.pathCoordinates;
    if (savedPath?.length && typeof window !== "undefined" && window.google?.maps?.LatLngBounds) {
      const bounds = new window.google.maps.LatLngBounds();
      savedPath.forEach((p) => bounds.extend({ lat: Number(p.lat), lng: Number(p.lng) }));
      map.fitBounds(bounds, 48);
    } else if (userPosRef.current && !hasCenteredRef.current) {
      /* Center immediately if GPS already resolved before map loaded */
      map.panTo({ lat: userPosRef.current[0], lng: userPosRef.current[1] });
      hasCenteredRef.current = true;
    }

    map.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const mode = mapModeRef.current;
      const pos = userPosRef.current;

      if (mode === "report") {
        setClickedPos([lat, lng]);
        setReportDesc("");
        setReportType("pothole");
        setSelectedReport(true);
        setSelectedHazardId(null);
        setSelectedUser(false);
        setSelectedTarget(false);
      } else if (mode === "route" && pos && !startPlaceRef.current && !endPlaceRef.current) {
        setTargetPos([lat, lng]);
        setRouteLoading(true);
        setRouteDistance(null);
        setRouteDuration(null);
        setSelectedTarget(true);
        setSelectedHazardId(null);
        setSelectedUser(false);
        setSelectedReport(false);
        (async () => {
          try {
            const res = await fetch(
              `https://router.project-osrm.org/route/v1/cycling/${pos[1]},${pos[0]};${lng},${lat}?overview=full&geometries=geojson`,
            );
            const data = await res.json();
            if (data.routes?.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map((c) => ({
                lat: c[1],
                lng: c[0],
              }));
              setRouteCoords(coords);
              setRouteDistance(parseFloat((data.routes[0].distance / 1000).toFixed(2)));
              setRouteDuration(data.routes[0].duration ? Math.round(data.routes[0].duration) : null);
            } else {
              setRouteCoords([{ lat: pos[0], lng: pos[1] }, { lat, lng }]);
              setRouteDistance(parseFloat(haversineKm(pos[0], pos[1], lat, lng).toFixed(2)));
              setRouteDuration(null);
            }
          } catch {
            setRouteCoords([{ lat: pos[0], lng: pos[1] }, { lat, lng }]);
            setRouteDistance(parseFloat(haversineKm(pos[0], pos[1], lat, lng).toFixed(2)));
            setRouteDuration(null);
          } finally {
            setRouteLoading(false);
          }
        })();
      }
    });
  }, [initialRoute]);

  /* ────────────────────────────────────────────
     4. Submit hazard report + optimistic update
     ──────────────────────────────────────────── */
  const handleReportSubmit = async (e) => {
    e?.stopPropagation?.();
    if (!clickedPos || !token) return;
    setReporting(true);
    const hazardData = {
      lat: clickedPos[0],
      lng: clickedPos[1],
      type: reportType,
      description: (reportDesc || "").trim(),
    };
    console.log("[Report Hazard] Sending payload:", hazardData);
    try {
      const newHazard = await reportHazard(token, hazardData);
      /* Add to local state immediately */
      setHazards((prev) => [newHazard, ...prev]);
      setClickedPos(null);
      setSelectedReport(false);
      toast.success("Hazard reported!");
    } catch (err) {
      console.error("Failed to report hazard:", err);
      toast.error("Failed to report hazard");
    } finally {
      setReporting(false);
    }
  };

  const handleHazardUpdate = (updatedHazard) => {
    setHazards((prev) => prev.map((h) => (h._id === updatedHazard._id ? updatedHazard : h)));
    toast.success("Hazard updated!");
  };

  const handleHazardDelete = (deletedId) => {
    setHazards((prev) => prev.filter((h) => h._id !== deletedId));
    setSelectedHazardId(null);
    toast.success("Hazard deleted!");
  };

  const handleStartRide = async (e, routeId = null) => {
    e?.stopPropagation?.();
    if (!token) return;
    try {
      const ride = await startRide(token, {
        routeId,
        startLocation: startPlace?.label || "Current Location",
      });
      setActiveRide(ride);
      sessionDistRef.current = 0;
      prevPosRef.current = null;
      toast.success("Ride started! Start cycling to track distance.");
    } catch (err) {
      console.error("Failed to start ride:", err);
      toast.error(err.response?.data?.message || "Failed to start ride");
    }
  };

  const handleSaveRide = async (e) => {
    e?.stopPropagation?.();
    const dist = sessionDistRef.current;
    if (dist < 0.01 || !token) return;

    try {
      let startLocation = startPlace?.label ?? undefined;
      let endLocation = endPlace?.label ?? undefined;

      if (startLocation == null || endLocation == null) {
        if (routeCoords.length >= 2) {
          const [startName, endName] = await Promise.all([
            reverseGeocode(routeCoords[0].lat, routeCoords[0].lng),
            reverseGeocode(routeCoords[routeCoords.length - 1].lat, routeCoords[routeCoords.length - 1].lng),
          ]);
          if (startLocation == null) startLocation = startName || "Start";
          if (endLocation == null) endLocation = endName || "End";
        } else if (userPos && userPos.length >= 2) {
          const endName = await reverseGeocode(userPos[0], userPos[1]);
          if (endLocation == null) endLocation = endName || "Current location";
          if (startLocation == null) startLocation = "Start";
        }
      }

      const duration = routeDurationText || undefined;

      if (activeRide) {
        // End active ride
        const result = await endRide(token, activeRide._id, {
          distance: parseFloat(dist.toFixed(2)),
          endLocation: endLocation || "Current Location",
          duration,
        });
        setActiveRide(null);
        toast.success(`Ride completed! +${result.rewards.tokensEarned} tokens earned!`);
        if (activeRide.routeId) {
          toast.success("Rate this route to help the community!", { duration: 5000 });
        }
        if (onRideUpdate) onRideUpdate(result);
      } else {
        // Legacy: Quick save (backward compatibility)
        const data = await updateDistance(token, parseFloat(dist.toFixed(2)), {
          startLocation: startLocation || undefined,
          endLocation: endLocation || undefined,
          duration,
        });
        toast.success("Ride saved!");
        if (onRideUpdate) onRideUpdate(data);
      }

      sessionDistRef.current = 0;
    } catch (err) {
      console.error("Failed to save ride:", err);
      toast.error(err.response?.data?.message || "Failed to save ride");
    }
  };

  const handleCancelRide = async (e) => {
    e?.stopPropagation?.();
    if (!activeRide || !token) return;
    try {
      await cancelRide(token, activeRide._id);
      setActiveRide(null);
      sessionDistRef.current = 0;
      toast.success("Ride cancelled");
    } catch (err) {
      console.error("Failed to cancel ride:", err);
      toast.error("Failed to cancel ride");
    }
  };

  const clearRoute = (e) => {
    e?.stopPropagation?.();
    setRouteCoords([]);
    setTargetPos(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteDurationText("");
    setSavedWeatherCondition("");
    setStartPlace(null);
    setEndPlace(null);
    setStartQuery("");
    setEndQuery("");
    setWeather(null);
    setSelectedTarget(false);
    appliedSavedRouteRef.current = false;
  };

  /* Edit mode: either navigated via "Edit" (isEditingRoute) or viewing own route (creator match) */
  const creatorId = initialRoute?.creatorId?._id ?? initialRoute?.creatorId;
  const isOwnRoute = Boolean(userId && creatorId && String(creatorId) === String(userId));
  const isEditMode = Boolean(initialRoute?._id && (isEditingRoute || isOwnRoute));

  const handleSaveRoute = async (e) => {
    e?.stopPropagation?.();
    if (routeCoords.length < 2 || routeDistance == null || !token) return;
    setSavingRoute(true);
    try {
      const startLocation = startPlace?.label ?? "Current location";
      const endLocation = endPlace?.label ?? (targetPos ? `Destination (${targetPos[0].toFixed(4)}, ${targetPos[1].toFixed(4)})` : "Destination");
      const weatherCondition = weather
        ? `${weatherFromCode(weather.code).label}${weather.temp != null ? `, ${Math.round(weather.temp)}°C` : ""}`
        : "";
      const payload = {
        startLocation,
        endLocation,
        path: routeCoords,
        distance: `${routeDistance} km`,
        duration: routeDuration != null ? formatDuration(routeDuration) : "",
        weatherCondition,
      };
      if (isEditMode) {
        const routeId = initialRoute._id?.toString?.() ?? String(initialRoute._id);
        await updateRoute(token, routeId, payload);
        toast.success("Route updated successfully", {
          style: { background: "#fdf2f8", border: "1px solid #fbcfe8", color: "#80134D" },
          iconTheme: { primary: "#80134D" },
        });
        navigate("/dashboard/routes", { replace: true });
      } else {
        await saveRoute(token, payload);
        toast.success("Route saved successfully and shared with the community!", {
          style: { background: "#fdf2f8", border: "1px solid #fbcfe8", color: "#80134D" },
          iconTheme: { primary: "#80134D" },
        });
      }
    } catch (err) {
      console.error(isEditMode ? "Update route failed:" : "Save route failed:", err);
      toast.error(err.response?.data?.message || (isEditMode ? "Failed to update route" : "Failed to save route"), {
        style: { background: "#fdf2f8", border: "1px solid #fbcfe8", color: "#80134D" },
        iconTheme: { primary: "#80134D" },
      });
    } finally {
      setSavingRoute(false);
    }
  };

  /* Destination coords for weather: manual end or click target */
  const destinationCoords = endPlace ? { lat: endPlace.lat, lng: endPlace.lng } : (targetPos ? { lat: targetPos[0], lng: targetPos[1] } : null);

  /* Fetch Nominatim suggestions (debounced) */
  useEffect(() => {
    if (!startQuery.trim()) {
      setStartSuggestions([]);
      return;
    }
    if (nominatimDebounceRef.current) clearTimeout(nominatimDebounceRef.current);
    nominatimDebounceRef.current = setTimeout(async () => {
      setStartSearching(true);
      try {
        const { data } = await axios.get(NOMINATIM_URL, {
          params: { q: startQuery, format: "json", limit: 5 },
          headers: { Accept: "application/json" },
        });
        setStartSuggestions(Array.isArray(data) ? data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), display_name: d.display_name, label: d.display_name })) : []);
      } catch {
        setStartSuggestions([]);
      } finally {
        setStartSearching(false);
      }
    }, 400);
    return () => {
      if (nominatimDebounceRef.current) clearTimeout(nominatimDebounceRef.current);
    };
  }, [startQuery]);

  useEffect(() => {
    if (!endQuery.trim()) {
      setEndSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      setEndSearching(true);
      try {
        const { data } = await axios.get(NOMINATIM_URL, {
          params: { q: endQuery, format: "json", limit: 5 },
          headers: { Accept: "application/json" },
        });
        setEndSuggestions(Array.isArray(data) ? data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), display_name: d.display_name, label: d.display_name })) : []);
      } catch {
        setEndSuggestions([]);
      } finally {
        setEndSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [endQuery]);

  /* When start or end changes, mark as needing recalc and allow OSRM to recalculate */
  useEffect(() => {
    if (startPlace && endPlace && routeCoords.length > 0 && appliedSavedRouteRef.current) {
      // Reset the flag so OSRM can recalculate when editing
      appliedSavedRouteRef.current = false;
      setRouteNeedsRecalc(true);
    }
  }, [startPlace?.lat, startPlace?.lng, endPlace?.lat, endPlace?.lng]);

  /* Fetch OSRM route when both Start and End are set (skip if we just loaded a saved route) */
  useEffect(() => {
    if (!startPlace || !endPlace || !mapRef.current || appliedSavedRouteRef.current) return;
    setRouteLoading(true);
    const from = `${startPlace.lng},${startPlace.lat}`;
    const to = `${endPlace.lng},${endPlace.lat}`;
    axios
      .get(`https://router.project-osrm.org/route/v1/cycling/${from};${to}?overview=full&geometries=geojson`)
      .then(({ data }) => {
        if (data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] }));
          setRouteCoords(coords);
          setRouteDistance(parseFloat((data.routes[0].distance / 1000).toFixed(2)));
          setRouteDuration(Math.round(data.routes[0].duration || 0));
          if (mapRef.current && typeof window !== "undefined" && window.google?.maps?.LatLngBounds) {
            const bounds = new window.google.maps.LatLngBounds();
            coords.forEach((c) => bounds.extend(c));
            mapRef.current.fitBounds(bounds, 48);
          }
        } else {
          setRouteCoords([{ lat: startPlace.lat, lng: startPlace.lng }, { lat: endPlace.lat, lng: endPlace.lng }]);
          setRouteDistance(parseFloat(haversineKm(startPlace.lat, startPlace.lng, endPlace.lat, endPlace.lng).toFixed(2)));
          setRouteDuration(null);
        }
      })
      .catch(() => {
        setRouteCoords([{ lat: startPlace.lat, lng: startPlace.lng }, { lat: endPlace.lat, lng: endPlace.lng }]);
        setRouteDistance(parseFloat(haversineKm(startPlace.lat, startPlace.lng, endPlace.lat, endPlace.lng).toFixed(2)));
        setRouteDuration(null);
      })
      .finally(() => {
        setRouteLoading(false);
        setRouteNeedsRecalc(false); // Clear the flag when OSRM finishes
      });
  }, [startPlace?.lat, startPlace?.lng, endPlace?.lat, endPlace?.lng]);

  /* Fetch weather at destination (Open-Meteo) */
  useEffect(() => {
    if (!destinationCoords) {
      setWeather(null);
      return;
    }
    setWeatherLoading(true);
    axios
      .get("https://api.open-meteo.com/v1/forecast", {
        params: {
          latitude: destinationCoords.lat,
          longitude: destinationCoords.lng,
          current: "temperature_2m,weather_code",
          timezone: "auto",
        },
      })
      .then(({ data }) => {
        const cur = data.current;
        setWeather({
          temp: cur?.temperature_2m ?? null,
          code: cur?.weather_code ?? 0,
        });
      })
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [destinationCoords?.lat, destinationCoords?.lng]);

  const isOwnHazard = (h) => {
    const reporterId = h.reportedBy?._id || h.reportedBy;
    return String(reporterId) === String(userId);
  };

  /* ── Early returns — loading / error ── */

  if (loadError || !apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-2xl p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-sm font-semibold text-slate-800 mb-1">Map could not load</p>
        <p className="text-xs text-slate-500">
          {!apiKey
            ? "Add VITE_GOOGLE_MAPS_API_KEY to your .env file."
            : "Check your Google Maps API key and network."}
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 rounded-2xl">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading map...</p>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="relative w-full h-full">
      {/* Loading skeleton overlays */}
      {gpsLoading && !userPos && <MapLoadingSkeleton message="Getting your location..." />}
      {hazardsLoading && <MapLoadingSkeleton message="Loading hazards..." />}

      {/* ── Map controls overlay ── */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-[1000] flex flex-col gap-1.5 sm:gap-2 max-w-[calc(100%-100px)] sm:max-w-none">
        <div className="flex gap-0.5 sm:gap-1 bg-white rounded-lg sm:rounded-xl shadow-lg p-0.5 sm:p-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMapMode("route"); setClickedPos(null); setSelectedReport(false); }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
              mapMode === "route" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Route
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMapMode("report"); setClickedPos(null); setSelectedReport(false); }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
              mapMode === "report" ? "bg-red-500 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Report
          </button>
        </div>

        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow max-w-[200px] sm:max-w-[220px]">
            {gpsError}
          </div>
        )}

        {routeDistance !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 max-w-[160px] sm:max-w-[200px] border border-white/40">
            {isEditMode && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-md mb-1.5 flex items-center gap-1">
                <Pencil className="w-3 h-3 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-semibold">Editing Route</span>
              </div>
            )}
            <p className="text-[10px] sm:text-xs font-semibold text-slate-800 mb-0.5 sm:mb-1">
              {isEditMode ? "Updated Route" : "Route"}
            </p>
            <p className="text-base sm:text-lg font-bold text-primary">{routeDistance} km</p>
            {isEditMode && initialRoute?.distance && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Original: {typeof initialRoute.distance === "string" ? initialRoute.distance : `${initialRoute.distance} km`}
                {routeDistance !== parseFloat(String(initialRoute.distance).replace(/[^\d.]/g, "")) && (
                  <span className="text-blue-600 font-semibold ml-1">
                    {routeDistance > parseFloat(String(initialRoute.distance).replace(/[^\d.]/g, "")) ? "↑" : "↓"}
                  </span>
                )}
              </p>
            )}
            {(routeDuration != null || routeDurationText) && (
              <p className="text-xs text-slate-500 mt-0.5">
                {routeDuration != null ? `~${formatDuration(routeDuration)} by bike` : routeDurationText ? `~${routeDurationText} by bike` : ""}
              </p>
            )}
            {savedWeatherCondition && (
              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1" title="Weather when route was saved">
                <span className="text-slate-400">When saved:</span> {savedWeatherCondition}
              </p>
            )}
            {routeNeedsRecalc && (
              <div className="text-[9px] sm:text-[10px] text-amber-600 flex items-center gap-1 mt-1 bg-amber-50 border border-amber-200 px-1.5 py-1 rounded">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Recalculating route...
              </div>
            )}
            <div className="mt-1.5 sm:mt-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={savingRoute || routeLoading}
                className="w-full flex items-center justify-center gap-1 text-[10px] sm:text-xs font-semibold bg-primary text-white py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingRoute ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {isEditMode ? "Update Route" : "Save Route"}
              </button>
              <button type="button" onClick={clearRoute} className="text-[10px] sm:text-xs text-red-500 hover:text-red-700 font-medium">Clear route</button>
            </div>
          </div>
        )}

        {routeLoading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 flex items-center gap-1.5 sm:gap-2 border border-white/40">
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-spin" />
            <span className="text-[10px] sm:text-xs text-slate-600">Calculating route...</span>
          </div>
        )}

        {/* ── Start / End search (glassmorphism) - Only show in route mode ── */}
        {mapMode === "route" && (
          <div className="bg-white/80 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg border border-white/40 p-2 sm:p-2.5 space-y-1.5 sm:space-y-2 w-[140px] sm:w-[170px]">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">Plan route</p>
            <LocationSearchInput
              placeholder="Start location"
              value={startQuery}
              onChange={setStartQuery}
              suggestions={startSuggestions}
              onSelect={(s) => { setStartPlace({ lat: s.lat, lng: s.lng, label: s.display_name || s.label }); setStartQuery(s.display_name || s.label || ""); setShowStartDropdown(false); }}
              loading={startSearching}
              showDropdown={showStartDropdown}
              onFocus={() => setShowStartDropdown(true)}
              onBlur={() => setShowStartDropdown(false)}
            />
            <LocationSearchInput
              placeholder="End location"
              value={endQuery}
              onChange={setEndQuery}
              suggestions={endSuggestions}
              onSelect={(s) => { setEndPlace({ lat: s.lat, lng: s.lng, label: s.display_name || s.label }); setEndQuery(s.display_name || s.label || ""); setShowEndDropdown(false); }}
              loading={endSearching}
              showDropdown={showEndDropdown}
              onFocus={() => setShowEndDropdown(true)}
              onBlur={() => setShowEndDropdown(false)}
            />
          </div>
        )}
      </div>

      {/* ── Session distance & save ── */}
      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg p-2 sm:p-3 text-center min-w-[72px] sm:min-w-[90px] border border-white/40">
          {activeRide && (
            <p className="text-[9px] sm:text-[10px] font-semibold uppercase text-green-600 leading-tight mb-1 flex items-center gap-1 justify-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Active Ride
            </p>
          )}
          <p className="text-[9px] sm:text-[10px] font-semibold uppercase text-slate-400 leading-tight">Session</p>
          <p className="text-sm sm:text-lg font-bold text-primary">{sessionDistRef.current.toFixed(2)} km</p>

          {!activeRide ? (
            <button
              type="button"
              onClick={handleStartRide}
              disabled={loadingActiveRide}
              className="mt-1 sm:mt-1.5 text-[10px] sm:text-[11px] font-semibold bg-primary text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1 mx-auto disabled:opacity-50"
            >
              <Bike className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Start Ride
            </button>
          ) : (
            <div className="flex flex-col gap-1 mt-1 sm:mt-1.5">
              <button
                type="button"
                onClick={handleSaveRide}
                className="text-[10px] sm:text-[11px] font-semibold bg-green-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 mx-auto"
              >
                <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> End Ride
              </button>
              <button
                type="button"
                onClick={handleCancelRide}
                className="text-[9px] sm:text-[10px] font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 mx-auto"
              >
                <X className="w-2 h-2 sm:w-2.5 sm:h-2.5" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Weather at destination (glassmorphism) ── */}
      {destinationCoords && (
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 z-[1000]">
          <div className="bg-white/85 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg border border-white/40 p-2.5 sm:p-3 min-w-[140px] sm:min-w-[180px]">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ThermometerSun className="w-3 h-3 text-primary" /> Destination weather
            </p>
            {weatherLoading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs text-slate-500">Loading...</span>
              </div>
            ) : weather ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {(() => {
                  const { label, Icon, tip } = weatherFromCode(weather.code);
                  return (
                    <>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-bold text-slate-800">
                          {weather.temp != null ? `${Math.round(weather.temp)}°C` : "—"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate" title={tip}>
                          {label} — {tip}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data</p>
            )}
          </div>
        </div>
      )}

      {/* ── Google Map ── */}
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER}
        defaultCenter={DEFAULT_CENTER}
        center={DEFAULT_CENTER}
        zoom={15}
        onLoad={onMapLoad}
        options={{
          gestureHandling: "greedy",
          zoomControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
        }}
      >
        {/* ── Current user cycling icon marker ── */}
        {userPos && (
          <Marker
            position={{ lat: userPos[0], lng: userPos[1] }}
            icon={CYCLIST_ICON}
            zIndex={1000}
            onClick={() => {
              setSelectedUser(true);
              setSelectedHazardId(null);
              setSelectedReport(false);
              setSelectedTarget(false);
            }}
          >
            {selectedUser && (
              <InfoWindow
                position={{ lat: userPos[0], lng: userPos[1] }}
                onCloseClick={() => setSelectedUser(false)}
              >
                <div className="text-center py-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <strong className="text-sm text-primary">You are here</strong>
                  </div>
                  <span className="text-xs text-slate-500">
                    {userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}
                  </span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── Hazard markers ── */}
        {hazards.map((h) => {
          const own = isOwnHazard(h);
          return (
            <Marker
              key={h._id}
              position={{ lat: h.lat, lng: h.lng }}
              icon={own ? OWN_HAZARD_ICON : HAZARD_ICON}
              onClick={() => {
                setSelectedHazardId(h._id);
                setSelectedUser(false);
                setSelectedReport(false);
                setSelectedTarget(false);
              }}
            >
              {selectedHazardId === h._id && (
                <InfoWindow
                  position={{ lat: h.lat, lng: h.lng }}
                  onCloseClick={() => setSelectedHazardId(null)}
                >
                  <HazardPopupContent
                    hazard={h}
                    isOwn={own}
                    token={token}
                    userId={userId}
                    onUpdate={handleHazardUpdate}
                    onDelete={handleHazardDelete}
                  />
                </InfoWindow>
              )}
            </Marker>
          );
        })}

        {/* ── New report marker ── */}
        {clickedPos && (
          <Marker
            position={{ lat: clickedPos[0], lng: clickedPos[1] }}
            icon={HAZARD_ICON}
            onClick={() => {
              setSelectedReport(true);
              setSelectedHazardId(null);
              setSelectedUser(false);
              setSelectedTarget(false);
            }}
          >
            {selectedReport && (
              <InfoWindow
                position={{ lat: clickedPos[0], lng: clickedPos[1] }}
                onCloseClick={() => { setSelectedReport(false); setClickedPos(null); }}
              >
                <div className="min-w-[200px] p-1" onClick={(e) => e.stopPropagation()}>
                  <p className="font-bold text-sm mb-2 text-slate-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Report a Hazard
                  </p>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2"
                  >
                    {HAZARD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-2"
                    maxLength={200}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleReportSubmit}
                      disabled={reporting}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      {reporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Report
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setClickedPos(null); setSelectedReport(false); }}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── Manual route: Start marker (A) ── */}
        {startPlace && (
          <Marker
            position={{ lat: startPlace.lat, lng: startPlace.lng }}
            icon={START_ICON}
            zIndex={900}
            title={startPlace.label || "Start"}
          />
        )}

        {/* ── Manual route: End marker (B) ── */}
        {endPlace && (
          <Marker
            position={{ lat: endPlace.lat, lng: endPlace.lng }}
            icon={END_ICON}
            zIndex={900}
            title={endPlace.label || "End"}
          />
        )}

        {/* ── Route target marker (click mode) ── */}
        {targetPos && (
          <Marker
            position={{ lat: targetPos[0], lng: targetPos[1] }}
            icon={TARGET_ICON}
            onClick={() => {
              setSelectedTarget(true);
              setSelectedHazardId(null);
              setSelectedUser(false);
              setSelectedReport(false);
            }}
          >
            {selectedTarget && (
              <InfoWindow
                position={{ lat: targetPos[0], lng: targetPos[1] }}
                onCloseClick={() => setSelectedTarget(false)}
              >
                <div className="text-center py-1" onClick={(e) => e.stopPropagation()}>
                  <strong className="text-emerald-600">Target</strong>
                  <br />
                  <span className="text-xs">{targetPos[0].toFixed(5)}, {targetPos[1].toFixed(5)}</span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── Route polyline (green #22C55E when editing, else emerald) ── */}
        {routeCoords.length > 0 && (
          <Polyline
            path={routeCoords}
            options={{
              strokeColor: isEditMode ? "#22C55E" : "#10b981",
              strokeWeight: isEditMode ? 6 : 5,
              strokeOpacity: isEditMode ? 1.0 : 0.9,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
