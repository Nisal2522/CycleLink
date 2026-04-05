/**
 * AdminRouteOverviewPage.jsx
 * --------------------------------------------------
 * Admin Live Route Overview: full-screen map with approved routes, auto-detected
 * issues (inaccurate path, safety, duplicate, junk), side panel with actions, legend.
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useJsApiLoader, GoogleMap, Polyline, Marker, InfoWindow, TrafficLayer } from "@react-google-maps/api";
import { Loader2, AlertCircle, MapPin, Filter, ExternalLink, User, Clock, AlertTriangle, X, Pencil, Trash2 } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getApprovedRoutes, getRouteIssues, deleteAdminRoute, getAdminHazards, resolveAdminHazard, deleteAdminHazard } from "../services/adminService";
import toast from "react-hot-toast";

const HAZARD_TYPE_LABELS = { pothole: "Pothole", construction: "Construction", accident: "Accident", flooding: "Flooding", other: "Other" };
/* Yellow triangle warning sign — distinguishes hazards from route markers */
const HAZARD_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" width="40" height="44"><path fill="#eab308" stroke="#ca8a04" stroke-width="1.5" d="M20 2L38 38H2z"/><text x="20" y="28" text-anchor="middle" fill="#1c1917" font-size="20" font-weight="bold" font-family="sans-serif">!</text></svg>`;
const HAZARD_MARKER_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(HAZARD_ICON_SVG),
  scaledSize: { width: 40, height: 44 },
  anchor: { x: 20, y: 44 },
};

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 };
const MAP_CONTAINER = { width: "100%", height: "100%", minHeight: "100vh" };

/* Green marker for Start (first coordinate); Red for End (last coordinate) */
const GREEN_START_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="16" fill="#22c55e" stroke="white" stroke-width="2"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold">S</text></svg>`;
const RED_END_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36"><circle cx="18" cy="18" r="16" fill="#ef4444" stroke="white" stroke-width="2"/><text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold">E</text></svg>`;
const GREEN_START_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(GREEN_START_SVG),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
};
const RED_END_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(RED_END_SVG),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
};

const ROUTE_COLORS = [
  "#80134D",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

const ISSUE_STYLES = {
  inaccurate: { strokeColor: "#ef4444", strokeOpacity: 0.95, strokeWeight: 5, dashed: true },
  duplicate: { strokeColor: "#ea580c", strokeOpacity: 0.95, strokeWeight: 10 },
  junk: { strokeColor: "#9ca3af", strokeOpacity: 0.5, strokeWeight: 4 },
};

const SAFETY_WARNING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="32" height="32"><circle cx="18" cy="18" r="16" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="18" y="24" text-anchor="middle" font-size="20">⚠️</text></svg>`;
const SAFETY_WARNING_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(SAFETY_WARNING_SVG),
  scaledSize: { width: 32, height: 32 },
  anchor: { x: 16, y: 16 },
};

function parseDistanceKm(distanceStr) {
  if (!distanceStr || typeof distanceStr !== "string") return 0;
  const num = parseFloat(distanceStr.replace(/[^\d.]/g, "")) || 0;
  if (distanceStr.toLowerCase().includes("mi")) return num * 1.60934;
  return num;
}

export default function AdminRouteOverviewPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [infoPosition, setInfoPosition] = useState(null);
  const [routeIssues, setRouteIssues] = useState({});
  const [panelRoute, setPanelRoute] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [deletingHazardId, setDeletingHazardId] = useState(null);
  const [resolvingHazardId, setResolvingHazardId] = useState(null);
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [trafficOn, setTrafficOn] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    id: "cycle-google-map",
  });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getApprovedRoutes(token), getRouteIssues(token), getAdminHazards(token)])
      .then(([routesData, issuesData, hazardsData]) => {
        if (!cancelled) {
          setRoutes(Array.isArray(routesData) ? routesData : []);
          setRouteIssues(typeof issuesData === "object" && issuesData !== null ? issuesData : {});
          const hazardList = Array.isArray(hazardsData) ? hazardsData : [];
          setHazards(hazardList);
          if (hazardList.length > 0) console.log("[Admin Hazards] Fetched full hazard objects:", hazardList.length, "sample:", hazardList[0]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load routes");
          setRoutes([]);
          setRouteIssues({});
          setHazards([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const km = parseDistanceKm(r.distance);
      if (distanceFilter === "under10" && km >= 10) return false;
      if (distanceFilter === "10to25" && (km < 10 || km > 25)) return false;
      if (distanceFilter === "over25" && km <= 25) return false;
      const loc = (locationFilter || "").trim().toLowerCase();
      if (loc) {
        const start = (r.startLocation || "").toLowerCase();
        const end = (r.endLocation || "").toLowerCase();
        if (!start.includes(loc) && !end.includes(loc)) return false;
      }
      return true;
    });
  }, [routes, distanceFilter, locationFilter]);

  const handleRouteSelect = useCallback((route, position) => {
    setSelectedHazard(null);
    setSelectedRoute(route);
    setInfoPosition(position);
    const issues = routeIssues[String(route._id)];
    if (issues && (issues.inaccuratePath || issues.safetyIssue || issues.duplicate || issues.junk)) {
      setPanelRoute({ route, issues });
    } else {
      setPanelRoute(null);
    }
  }, [routeIssues]);

  const handleViewDetails = useCallback(() => {
    setSelectedRoute(null);
    setPanelRoute(null);
    navigate("/admin-panel?tab=routes");
  }, [navigate]);

  const handlePanelKeep = useCallback(() => {
    setPanelRoute(null);
  }, []);

  const handlePanelEdit = useCallback(() => {
    setPanelRoute(null);
    navigate("/admin-panel?tab=routes");
  }, [navigate]);

  const handlePanelDelete = useCallback(async () => {
    if (!panelRoute?.route?._id || !token) return;
    const id = panelRoute.route._id;
    setDeletingId(id);
    try {
      await deleteAdminRoute(token, id);
      setRoutes((prev) => prev.filter((r) => r._id !== id));
      setSelectedRoute(null);
      setPanelRoute(null);
      toast.success("Route deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }, [panelRoute, token]);

  const getPolylineOptions = useCallback((route, index) => {
    const issues = routeIssues[String(route._id)] || {};
    if (issues.inaccuratePath) {
      return {
        strokeColor: "#ef4444",
        strokeOpacity: 0,
        strokeWeight: 0,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeColor: "#ef4444",
              strokeOpacity: 1,
              strokeWeight: 2,
              scale: 4,
            },
            repeat: "20px",
          },
        ],
      };
    }
    if (issues.duplicate) return ISSUE_STYLES.duplicate;
    if (issues.junk) return ISSUE_STYLES.junk;
    return {
      strokeColor: ROUTE_COLORS[index % ROUTE_COLORS.length],
      strokeOpacity: 0.9,
      strokeWeight: 5,
    };
  }, [routeIssues]);

  const getPathCenter = useCallback((pathLatLng) => {
    if (!pathLatLng?.length) return null;
    const mid = Math.floor(pathLatLng.length / 2);
    return pathLatLng[mid];
  }, []);

  const handleResolveHazard = useCallback(async (hazard) => {
    if (!hazard?._id || !token) return;
    const id = String(hazard._id);
    setResolvingHazardId(id);
    try {
      await resolveAdminHazard(token, id);
      setHazards((prev) => prev.filter((h) => String(h._id) !== id));
      setSelectedHazard(null);
      toast.success("Hazard marked as resolved");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.status === 404 ? "Hazard not found or already resolved" : "Failed to resolve hazard";
      toast.error(msg);
    } finally {
      setResolvingHazardId(null);
    }
  }, [token]);

  const handleDeleteHazard = useCallback(async (hazard) => {
    if (!hazard?._id || !token) return;
    setDeletingHazardId(hazard._id);
    try {
      await deleteAdminHazard(token, hazard._id);
      setHazards((prev) => prev.filter((h) => h._id !== hazard._id));
      setSelectedHazard(null);
      toast.success("Hazard deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete hazard");
    } finally {
      setDeletingHazardId(null);
    }
  }, [token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
        Please log in as admin.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[100dvh] flex flex-col">
      {/* Filters overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 shadow-lg border border-slate-200">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
        </div>
        <select
          value={distanceFilter}
          onChange={(e) => setDistanceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          <option value="all">All distances</option>
          <option value="under10">Under 10 km</option>
          <option value="10to25">10 – 25 km</option>
          <option value="over25">Over 25 km</option>
        </select>
        <input
          type="text"
          placeholder="Filter by location (e.g. Colombo)"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 shadow-sm min-w-[180px] focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
        />
        <span className="text-sm text-slate-500">
          Showing {filteredRoutes.length} of {routes.length} routes
        </span>
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={trafficOn}
            onChange={(e) => setTrafficOn(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/30"
          />
          <span className="text-sm font-medium text-slate-700">Live traffic</span>
        </label>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 px-4 py-3 rounded-xl bg-white/95 shadow-lg border border-slate-200 text-sm">
        <p className="font-semibold text-slate-700 mb-2">Route issues</p>
        <ul className="space-y-1.5 text-slate-600">
          <li className="flex items-center gap-2">
            <span className="w-8 h-1 rounded border-2 border-red-500 border-dashed bg-red-500/20" style={{ background: "repeating-linear-gradient(90deg, #ef4444 0, #ef4444 6px, transparent 6px, transparent 12px)" }} />
            Inaccurate path (&gt;20m off road)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-amber-600" aria-hidden>⚠️</span>
            Safety (3+ hazards on route)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-8 h-2 rounded bg-orange-500 shrink-0" />
            Potential duplicate
          </li>
          <li className="flex items-center gap-2">
            <span className="w-8 h-1 rounded bg-slate-400 opacity-60 shrink-0" />
            Junk (&lt;200m or test/asdf)
          </li>
          <li className="flex items-center gap-2 pt-1 border-t border-slate-200 mt-1">
            <span className="w-0 h-0 shrink-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-amber-400" style={{ borderBottomColor: "#eab308" }} />
            User-reported hazards (click to resolve/delete)
          </li>
        </ul>
      </div>

      {/* Issue detail side panel */}
      {panelRoute && (
        <div className="absolute top-0 right-0 bottom-0 w-full max-w-sm z-20 bg-white shadow-xl border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Route issue</h3>
            <button type="button" onClick={handlePanelKeep} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-sm font-medium text-slate-700 mb-1">
              {panelRoute.route.startLocation} → {panelRoute.route.endLocation}
            </p>
            <p className="text-xs text-slate-500 mb-4">{panelRoute.route.distance || "—"}</p>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Detected issue</p>
              <p className="text-sm text-amber-900">{panelRoute.issues.detectedIssue || "—"}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Suggestion</p>
              <p className="text-sm text-slate-700">{panelRoute.issues.suggestion || "—"}</p>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
            <button type="button" onClick={handlePanelKeep} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
              Keep
            </button>
            <button type="button" onClick={handlePanelEdit} className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 inline-flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button type="button" onClick={handlePanelDelete} disabled={deletingId === panelRoute?.route?._id} className="w-full py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {deletingId === panelRoute?.route?._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 w-full relative min-h-[400px]">
        {!apiKey && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-600 p-4">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">Map unavailable</p>
            <p className="text-xs mt-1">Add VITE_GOOGLE_MAPS_API_KEY to .env</p>
          </div>
        )}
        {apiKey && loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-red-600 p-4">
            <AlertCircle className="w-10 h-10 mb-2" />
            <p className="text-sm">Failed to load map</p>
          </div>
        )}
        {apiKey && !isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm mt-2 text-slate-600">Loading map…</p>
          </div>
        )}
        {(loading && routes.length === 0) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-white shadow-lg border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-700">Loading routes…</span>
          </div>
        )}
        {error && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {apiKey && isLoaded && (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER}
            center={DEFAULT_CENTER}
            zoom={10}
            options={{
              gestureHandling: "greedy",
              zoomControl: true,
              mapTypeControl: true,
              fullscreenControl: true,
              streetViewControl: false,
            }}
          >
            {trafficOn && <TrafficLayer />}
            {filteredRoutes.map((route, index) => {
              const path = Array.isArray(route.path) ? route.path : [];
              const pathLatLng = path.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
              if (pathLatLng.length < 2) return null;
              const issues = routeIssues[String(route._id)] || {};
              const startPos = pathLatLng[0];
              const endPos = pathLatLng[pathLatLng.length - 1];
              const centerPos = getPathCenter(pathLatLng);
              const polylineOptions = getPolylineOptions(route, index);
              return (
                <Fragment key={route._id}>
                  <Polyline
                    path={pathLatLng}
                    options={polylineOptions}
                    onClick={(e) => e?.latLng && handleRouteSelect(route, { lat: e.latLng.lat(), lng: e.latLng.lng() })}
                  />
                  {issues.safetyIssue && centerPos && (
                    <Marker
                      position={centerPos}
                      icon={SAFETY_WARNING_ICON}
                      zIndex={101}
                      title={`Safety: ${issues.hazardCount || 0} hazards on route`}
                      onClick={() => handleRouteSelect(route, centerPos)}
                    />
                  )}
                  <Marker
                    position={startPos}
                    icon={GREEN_START_ICON}
                    zIndex={100}
                    title={`Start: ${route.startLocation || "Start"}`}
                    onClick={() => handleRouteSelect(route, startPos)}
                  />
                  <Marker
                    position={endPos}
                    icon={RED_END_ICON}
                    zIndex={100}
                    title={`End: ${route.endLocation || "End"}`}
                    onClick={() => handleRouteSelect(route, endPos)}
                  />
                </Fragment>
              );
            })}
            {hazards.map((h) => (
              <Marker
                key={h._id}
                position={{ lat: h.lat, lng: h.lng }}
                icon={HAZARD_MARKER_ICON}
                zIndex={90}
                title={`Hazard: ${HAZARD_TYPE_LABELS[h.type] || h.type || "—"}`}
                onClick={() => setSelectedHazard(h)}
              />
            ))}
            {selectedHazard && (
              <InfoWindow
                position={{ lat: selectedHazard.lat, lng: selectedHazard.lng }}
                onCloseClick={() => setSelectedHazard(null)}
              >
                <div className="p-3 min-w-[240px] bg-white" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Hazard Category</p>
                  <p className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    {HAZARD_TYPE_LABELS[selectedHazard.type] ?? selectedHazard.type ?? "—"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs text-slate-600 mb-3 min-h-[1.25rem]">
                    {selectedHazard.description != null && String(selectedHazard.description).trim() !== ""
                      ? String(selectedHazard.description)
                      : "No description"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Reporter Name</p>
                  <p className="text-xs text-slate-700 mb-4">
                    {(() => {
                      const rb = selectedHazard.reportedBy;
                      if (rb && typeof rb === "object" && (rb.name || rb.email)) return rb.name || rb.email;
                      if (rb && typeof rb === "string") return "Unknown reporter";
                      return "—";
                    })()}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolveHazard(selectedHazard)}
                      disabled={resolvingHazardId === selectedHazard._id || deletingHazardId === selectedHazard._id}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      {resolvingHazardId === selectedHazard._id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHazard(selectedHazard)}
                      disabled={deletingHazardId === selectedHazard._id || resolvingHazardId === selectedHazard._id}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {deletingHazardId === selectedHazard._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
            {selectedRoute && infoPosition && !panelRoute && (
              <InfoWindow
                position={infoPosition}
                onCloseClick={() => setSelectedRoute(null)}
              >
                <div className="p-1 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                  <p className="font-semibold text-slate-800 text-sm mb-2">
                    {selectedRoute.startLocation} → {selectedRoute.endLocation}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {selectedRoute.distance || "—"}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {selectedRoute.duration || "—"}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-2">
                    <User className="w-3 h-3 shrink-0" />
                    {selectedRoute.creatorId?.name || selectedRoute.creatorId?.email || "—"}
                  </p>
                  <button
                    type="button"
                    onClick={handleViewDetails}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Details
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}
