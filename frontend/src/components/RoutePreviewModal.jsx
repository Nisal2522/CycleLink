/**
 * RoutePreviewModal.jsx
 * --------------------------------------------------
 * Admin-only modal to preview a pending route on a map before Approve/Reject.
 * Uses same Google Maps API as LiveMap. Displays path polyline, start/end markers,
 * distance, duration, creator name. Approve and Reject buttons below the map.
 * --------------------------------------------------
 */

import { useCallback, useRef, useEffect } from "react";
import { useJsApiLoader, GoogleMap, Polyline, Marker } from "@react-google-maps/api";
import { X, MapPin, Clock, User, Loader2, Check, AlertCircle } from "lucide-react";

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 };
const MAROON = "#80134D";

/* Green marker for Start (first coordinate) */
const startIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <circle cx="18" cy="18" r="16" fill="#22c55e" stroke="white" stroke-width="2"/>
  <text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold">S</text>
</svg>`;

/* Red marker for End (last coordinate) */
const endIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <circle cx="18" cy="18" r="16" fill="#ef4444" stroke="white" stroke-width="2"/>
  <text x="18" y="24" text-anchor="middle" fill="white" font-size="14" font-weight="bold">E</text>
</svg>`;

const START_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(startIconSvg),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
};

const END_ICON = {
  url: "data:image/svg+xml," + encodeURIComponent(endIconSvg),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
};

export default function RoutePreviewModal({ route, onClose, onApprove, onReject, actioning }) {
  const mapRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    id: "cycle-google-map",
  });

  const path = Array.isArray(route?.path) ? route.path : [];
  const pathLatLng = path.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
  const start = pathLatLng[0];
  const end = pathLatLng[pathLatLng.length - 1];

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (pathLatLng.length >= 2 && typeof window !== "undefined" && window.google?.maps?.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        pathLatLng.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 48);
      }
    },
    [pathLatLng]
  );

  useEffect(() => {
    if (!mapRef.current || pathLatLng.length < 2 || !window.google?.maps?.LatLngBounds) return;
    const bounds = new window.google.maps.LatLngBounds();
    pathLatLng.forEach((p) => bounds.extend(p));
    mapRef.current.fitBounds(bounds, 48);
  }, [pathLatLng]);

  if (!route) return null;

  const creatorName = route.creatorId?.name || route.creatorId?.email || "—";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-lg font-bold text-slate-800 truncate">Route Preview</h2>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {route.startLocation} → {route.endLocation}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics row */}
        <div className="px-6 py-3 flex flex-wrap gap-4 sm:gap-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Distance</p>
              <p className="text-sm font-semibold text-slate-800">{route.distance || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estimated Time</p>
              <p className="text-sm font-semibold text-slate-800">{route.duration || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${MAROON}18` }}>
              <User className="w-4 h-4" style={{ color: MAROON }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Creator</p>
              <p className="text-sm font-semibold text-slate-800">{creatorName}</p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[280px] relative shrink-0">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm mt-2">Loading map…</p>
            </div>
          )}
          {apiKey && isLoaded && pathLatLng.length < 2 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500">
              <MapPin className="w-10 h-10 mb-2 text-slate-400" />
              <p className="text-sm">No path data to display</p>
            </div>
          )}
          {apiKey && isLoaded && pathLatLng.length >= 2 && (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%", minHeight: "280px" }}
              center={start || DEFAULT_CENTER}
              zoom={12}
              onLoad={onMapLoad}
              options={{
                gestureHandling: "greedy",
                zoomControl: true,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
              }}
            >
              <Polyline
                path={pathLatLng}
                options={{
                  strokeColor: MAROON,
                  strokeOpacity: 0.9,
                  strokeWeight: 5,
                }}
              />
              {start && (
                <Marker
                  position={start}
                  icon={START_ICON}
                  zIndex={100}
                  title={`Start: ${route.startLocation || "Start"}`}
                />
              )}
              {end && (
                <Marker
                  position={end}
                  icon={END_ICON}
                  zIndex={100}
                  title={`End: ${route.endLocation || "End"}`}
                />
              )}
            </GoogleMap>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onReject(route)}
            disabled={actioning}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Reject
          </button>
          <button
            type="button"
            onClick={() => onApprove(route)}
            disabled={actioning}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all"
          >
            {actioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
