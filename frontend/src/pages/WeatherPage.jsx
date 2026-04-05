/**
 * pages/WeatherPage.jsx
 * --------------------------------------------------
 * Dedicated weather forecast page for cyclists.
 *
 * Features:
 *   1. City search bar (Open-Meteo Geocoding API)
 *   2. Large "Current City" weather card with dynamic gradient
 *   3. 4 Sri Lankan cycling city comparison cards
 *   4. 5-day forecast grid/row
 *   5. Safety alerts for thunderstorm / heavy rain
 *
 * API: Open-Meteo (free, no API key)
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  Search,
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Thermometer,
  Droplets,
  Wind,
  Loader2,
  MapPin,
  Calendar,
  ShieldAlert,
  CloudSunRain,
  X,
} from "lucide-react";

/* ── Animations ── */
const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ── WMO weather codes ── */
function decodeWeather(code) {
  if (code === 0)                return { label: "Clear Sky",     Icon: Sun,            isRainy: false, isDangerous: false };
  if (code === 1)                return { label: "Mainly Clear",  Icon: Sun,            isRainy: false, isDangerous: false };
  if (code === 2)                return { label: "Partly Cloudy", Icon: CloudSun,       isRainy: false, isDangerous: false };
  if (code === 3)                return { label: "Overcast",      Icon: Cloud,          isRainy: false, isDangerous: false };
  if (code === 45 || code === 48) return { label: "Foggy",        Icon: CloudFog,       isRainy: false, isDangerous: false };
  if (code >= 51 && code <= 55)  return { label: "Drizzle",       Icon: CloudDrizzle,   isRainy: true,  isDangerous: false };
  if (code >= 56 && code <= 57)  return { label: "Freezing Drizzle", Icon: CloudDrizzle, isRainy: true, isDangerous: true };
  if (code >= 61 && code <= 63)  return { label: "Rain",          Icon: CloudRain,      isRainy: true,  isDangerous: false };
  if (code >= 65 && code <= 67)  return { label: "Heavy Rain",    Icon: CloudRain,      isRainy: true,  isDangerous: true  };
  if (code >= 71 && code <= 77)  return { label: "Snow",          Icon: CloudSnow,      isRainy: false, isDangerous: true  };
  if (code >= 80 && code <= 82)  return { label: "Rain Showers",  Icon: CloudRain,      isRainy: true,  isDangerous: code === 82 };
  if (code >= 85 && code <= 86)  return { label: "Snow Showers",  Icon: CloudSnow,      isRainy: false, isDangerous: true  };
  if (code >= 95)                return { label: "Thunderstorm",   Icon: CloudLightning, isRainy: true,  isDangerous: true  };
  return { label: "Unknown", Icon: Cloud, isRainy: false, isDangerous: false };
}

/* ── Day name helper ── */
function getDayName(dateStr, i) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

/* ── Dynamic gradient based on weather ── */
function getGradient(code, isDangerous) {
  if (isDangerous) return "from-slate-800 via-slate-700 to-red-900/80";
  if (code >= 61 || code >= 80 && code <= 82) return "from-slate-700 via-blue-900 to-slate-800";
  if (code >= 51 && code <= 57) return "from-slate-600 via-blue-800 to-slate-700";
  if (code === 3 || code === 45 || code === 48) return "from-slate-500 via-slate-600 to-slate-500";
  if (code === 2) return "from-sky-400 via-blue-400 to-sky-500";
  return "from-sky-400 via-amber-300 to-orange-300"; // clear / sunny
}

/* ── Sri Lankan cycling cities ── */
const SL_CITIES = [
  { name: "Colombo",       lat: 6.9271,  lng: 79.8612 },
  { name: "Kandy",         lat: 7.2906,  lng: 80.6337 },
  { name: "Galle",         lat: 6.0535,  lng: 80.2210 },
  { name: "Nuwara Eliya",  lat: 6.9497,  lng: 80.7891 },
];

/* ── Fetch current + daily for a location ── */
async function fetchWeatherData(lat, lng) {
  const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: lat,
      longitude: lng,
      current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      forecast_days: 6,
      timezone: "auto",
    },
  });
  return data;
}

/* ── Fetch current weather only (for city cards) ── */
async function fetchCurrentOnly(lat, lng) {
  const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: lat,
      longitude: lng,
      current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
      timezone: "auto",
    },
  });
  return data.current;
}

/* ══════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════ */

export default function WeatherPage() {
  /* ── State ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const [selectedCity, setSelectedCity] = useState({ name: "My Location", lat: null, lng: null });
  const [mainWeather, setMainWeather] = useState(null);
  const [mainLoading, setMainLoading] = useState(true);

  const [cityWeathers, setCityWeathers] = useState([]); // SL city cards
  const [citiesLoading, setCitiesLoading] = useState(true);

  const searchTimerRef = useRef(null);
  const searchBoxRef = useRef(null);

  /* ── 1. Get user location on mount ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      // Fallback to Colombo
      setSelectedCity({ name: "Colombo", lat: 6.9271, lng: 79.8612 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedCity((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
      },
      () => {
        setSelectedCity({ name: "Colombo", lat: 6.9271, lng: 79.8612 });
      },
      { timeout: 8000 }
    );
  }, []);

  /* ── 2. Fetch main weather when city changes ── */
  useEffect(() => {
    if (selectedCity.lat == null) return;
    let cancelled = false;
    setMainLoading(true);
    fetchWeatherData(selectedCity.lat, selectedCity.lng)
      .then((data) => { if (!cancelled) setMainWeather(data); })
      .catch(() => { if (!cancelled) setMainWeather(null); })
      .finally(() => { if (!cancelled) setMainLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCity.lat, selectedCity.lng]);

  /* ── 3. Fetch SL city cards on mount ── */
  useEffect(() => {
    let cancelled = false;
    setCitiesLoading(true);
    Promise.all(
      SL_CITIES.map(async (city) => {
        try {
          const current = await fetchCurrentOnly(city.lat, city.lng);
          return { ...city, current };
        } catch {
          return { ...city, current: null };
        }
      })
    ).then((results) => {
      if (!cancelled) {
        setCityWeathers(results);
        setCitiesLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  /* ── 4. City search with debounce ── */
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          "https://geocoding-api.open-meteo.com/v1/search",
          { params: { name: val.trim(), count: 6, language: "en" } }
        );
        setSearchResults(data.results || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectCity = (city) => {
    setSelectedCity({ name: city.name, lat: city.latitude, lng: city.longitude });
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  /* ── Close search dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Derived data ── */
  const currentData = mainWeather?.current;
  const dailyData = mainWeather?.daily;
  const decoded = currentData ? decodeWeather(currentData.weather_code) : null;

  return (
    <div className="min-h-[100dvh] md:min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

        {/* ── Header + Search ── */}
        <motion.div custom={0} variants={fadeIn} initial="hidden" animate="visible" className="mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <CloudSunRain className="w-5 h-5 text-sky-600" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900">
                  Weather Forecast
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Plan your ride — check conditions before you go
              </p>
            </div>

            {/* Search bar */}
            <div ref={searchBoxRef} className="relative w-full sm:w-72 lg:w-80">
              <div className="flex items-center bg-white/95 border border-slate-200 rounded-xl px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.12)] focus-within:ring-2 focus-within:ring-sky-300 focus-within:border-sky-300 transition">
                {searching ? (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Search city..."
                  className="flex-1 ml-2 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}>
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-[0_18px_45px_rgba(15,23,42,0.22)] z-50 overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={`${r.id}-${r.latitude}`}
                      onClick={() => selectCity(r)}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-700">{r.name}</span>
                      {r.admin1 && <span className="text-xs text-slate-400">{r.admin1}</span>}
                      <span className="text-xs text-slate-300 ml-auto">{r.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Main Weather Card (dynamic gradient) ── */}
        <motion.div custom={1} variants={fadeIn} initial="hidden" animate="visible" className="mb-5 sm:mb-6">
          {mainLoading ? (
            <div className="h-52 sm:h-60 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
            </div>
          ) : currentData && decoded ? (
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${getGradient(currentData.weather_code, decoded.isDangerous)} p-5 sm:p-7 lg:p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}>
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 sm:w-56 sm:h-56 opacity-10">
                <decoded.Icon className="w-full h-full" />
              </div>

              <div className="relative z-10">
                {/* City name */}
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <MapPin className="w-4 h-4 text-white/70" />
                  <span className="text-sm sm:text-base font-semibold text-white/90">{selectedCity.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  {/* Left: temp + condition */}
                  <div>
                    <div className="flex items-start gap-2">
                      <span className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-none">
                        {Math.round(currentData.temperature_2m)}°
                      </span>
                      <span className="text-lg sm:text-xl font-medium text-white/60 mt-1">C</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <decoded.Icon className="w-5 h-5 text-white/80" />
                      <span className="text-sm sm:text-base font-semibold text-white/80">{decoded.label}</span>
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="flex gap-5 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-sky-300" />
                      <div>
                        <p className="text-base sm:text-lg font-bold">{currentData.relative_humidity_2m}%</p>
                        <p className="text-[10px] sm:text-xs text-white/50">Humidity</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-teal-300" />
                      <div>
                        <p className="text-base sm:text-lg font-bold">{Math.round(currentData.wind_speed_10m)} km/h</p>
                        <p className="text-[10px] sm:text-xs text-white/50">Wind</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danger warning */}
                {decoded.isDangerous && (
                  <div className="mt-4 flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-red-500/30 border border-red-400/40">
                    <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-300 shrink-0" />
                    <p className="text-xs sm:text-sm font-semibold text-red-100">
                      Not Recommended for Cycling — {decoded.label} conditions detected
                    </p>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-52 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
              Weather data unavailable
            </div>
          )}
        </motion.div>

        {/* ── 5-Day Forecast ── */}
        {dailyData && (
          <motion.div custom={2} variants={fadeIn} initial="hidden" animate="visible" className="mb-5 sm:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-base sm:text-lg font-bold text-slate-800">5-Day Forecast</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
              {dailyData.time.slice(0, 5).map((date, i) => {
                const dayDecoded = decodeWeather(dailyData.weather_code[i]);
                const DayIcon = dayDecoded.Icon;
                const rainProb = dailyData.precipitation_probability_max[i];
                return (
                  <div
                    key={date}
                    className={`bg-white/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 transition-all hover:shadow-[0_22px_60px_rgba(15,23,42,0.32)] ${
                      dayDecoded.isDangerous ? "border-red-300 ring-1 ring-red-200" : "border-slate-100"
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-bold text-slate-700 mb-2">{getDayName(date, i)}</p>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 ${
                      dayDecoded.isRainy ? "bg-blue-50" : "bg-amber-50"
                    }`}>
                      <DayIcon className={`w-5 h-5 ${dayDecoded.isRainy ? "text-blue-500" : "text-amber-500"}`} />
                    </div>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {Math.round(dailyData.temperature_2m_max[i])}°
                    </p>
                    <p className="text-xs text-slate-400">
                      Low {Math.round(dailyData.temperature_2m_min[i])}°
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      <span className="text-[10px] sm:text-xs text-slate-500">{rainProb}%</span>
                    </div>
                    {dayDecoded.isDangerous && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-red-500">
                        <ShieldAlert className="w-3 h-3" />
                        Unsafe
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Sri Lanka City Comparison ── */}
        <motion.div custom={3} variants={fadeIn} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Cycling Cities — Sri Lanka</h2>
          </div>

          {citiesLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-36 sm:h-40 rounded-xl sm:rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {cityWeathers.map((city) => {
                if (!city.current) {
                  return (
                    <div key={city.name} className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 flex items-center justify-center text-xs text-slate-400">
                      {city.name} — unavailable
                    </div>
                  );
                }
                const cDecoded = decodeWeather(city.current.weather_code);
                const CIcon = cDecoded.Icon;
                return (
                  <button
                    key={city.name}
                    onClick={() => setSelectedCity({ name: city.name, lat: city.lat, lng: city.lng })}
                    className={`bg-white/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_18px_45px_rgba(15,23,42,0.22)] border border-slate-100/80 text-left transition-all hover:shadow-[0_22px_60px_rgba(15,23,42,0.32)] group ${
                      cDecoded.isDangerous ? "border-red-300 ring-1 ring-red-200" : "border-slate-100 hover:border-sky-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{city.name}</p>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        cDecoded.isRainy ? "bg-blue-50" : "bg-amber-50"
                      }`}>
                        <CIcon className={`w-4 h-4 ${cDecoded.isRainy ? "text-blue-500" : "text-amber-500"}`} />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                      {Math.round(city.current.temperature_2m)}°<span className="text-sm font-medium text-slate-400">C</span>
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{cDecoded.label}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-400" />{city.current.relative_humidity_2m}%
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Wind className="w-3 h-3 text-teal-400" />{Math.round(city.current.wind_speed_10m)} km/h
                      </span>
                    </div>

                    {cDecoded.isDangerous && (
                      <div className="mt-2 flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 border border-red-200">
                        <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="text-[10px] font-semibold text-red-600">Not Safe for Cycling</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
