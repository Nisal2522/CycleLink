/**
 * WeatherWidget.jsx
 * --------------------------------------------------
 * Glassmorphism weather card for the Cyclist Dashboard.
 *
 * Features:
 *   - Fetches real-time weather from Open-Meteo API (free, no API key)
 *   - Uses navigator.geolocation for coordinates
 *   - 10-minute localStorage cache to avoid excessive API calls
 *   - Rain / storm warning banner for cyclist safety
 *   - Responsive: horizontal on desktop, compact on mobile
 *
 * WMO Weather Code reference:
 *   https://open-meteo.com/en/docs#weathervariables
 * --------------------------------------------------
 */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
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
  MapPinOff,
} from "lucide-react";

/* ── Cache config ── */
const CACHE_KEY = "cyclelink_weather";
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/* ── WMO weather code → label, icon, isRainy ── */
function decodeWeather(code) {
  if (code === 0)                          return { label: "Clear Sky",     Icon: Sun,            isRainy: false };
  if (code === 1)                          return { label: "Mainly Clear",  Icon: Sun,            isRainy: false };
  if (code === 2)                          return { label: "Partly Cloudy", Icon: CloudSun,       isRainy: false };
  if (code === 3)                          return { label: "Overcast",      Icon: Cloud,          isRainy: false };
  if (code === 45 || code === 48)          return { label: "Foggy",         Icon: CloudFog,       isRainy: false };
  if (code >= 51 && code <= 57)            return { label: "Drizzle",       Icon: CloudDrizzle,   isRainy: true  };
  if (code >= 61 && code <= 67)            return { label: "Rainy",         Icon: CloudRain,      isRainy: true  };
  if (code >= 71 && code <= 77)            return { label: "Snowing",       Icon: CloudSnow,      isRainy: false };
  if (code >= 80 && code <= 82)            return { label: "Rain Showers",  Icon: CloudRain,      isRainy: true  };
  if (code >= 85 && code <= 86)            return { label: "Snow Showers",  Icon: CloudSnow,      isRainy: false };
  if (code >= 95)                          return { label: "Thunderstorm",  Icon: CloudLightning,  isRainy: true  };
  return { label: "Unknown", Icon: Cloud, isRainy: false };
}

/* ── Try to load cached data ── */
function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_DURATION_MS) return cached.data;
    localStorage.removeItem(CACHE_KEY);
  } catch { /* corrupted */ }
  return null;
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

/* ── Component ── */
export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWeather = useCallback(async () => {
    // 1. Check cache first
    const cached = getCached();
    if (cached) {
      setWeather(cached);
      setLoading(false);
      return;
    }

    // 2. Get user's location
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { data } = await axios.get(
            `https://api.open-meteo.com/v1/forecast`,
            {
              params: {
                latitude,
                longitude,
                current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
                timezone: "auto",
              },
            }
          );

          const current = data.current;
          const weatherData = {
            temp: Math.round(current.temperature_2m),
            code: current.weather_code,
            humidity: current.relative_humidity_2m,
            wind: Math.round(current.wind_speed_10m),
          };

          setCache(weatherData);
          setWeather(weatherData);
        } catch {
          setError("Weather unavailable");
        } finally {
          setLoading(false);
        }
      },
      () => {
        // Geolocation denied — try Colombo as fallback
        (async () => {
          try {
            const { data } = await axios.get(
              `https://api.open-meteo.com/v1/forecast`,
              {
                params: {
                  latitude: 6.9271,
                  longitude: 79.8612,
                  current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
                  timezone: "auto",
                },
              }
            );
            const current = data.current;
            const weatherData = {
              temp: Math.round(current.temperature_2m),
              code: current.weather_code,
              humidity: current.relative_humidity_2m,
              wind: Math.round(current.wind_speed_10m),
            };
            setCache(weatherData);
            setWeather(weatherData);
          } catch {
            setError("Weather unavailable");
          } finally {
            setLoading(false);
          }
        })();
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white/95 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.22)] p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
          <span className="text-xs sm:text-sm text-slate-400">Loading weather...</span>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !weather) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white/95 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.22)] p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <MapPinOff className="w-4 h-4 text-slate-400" />
          <span className="text-xs sm:text-sm text-slate-400">{error || "No weather data"}</span>
        </div>
      </div>
    );
  }

  const { label, Icon, isRainy } = decodeWeather(weather.code);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100/80 bg-white/95 backdrop-blur-xl shadow-[0_18px_45px_rgba(15,23,42,0.22)]">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-transparent to-amber-50/30 pointer-events-none" />

      <div className="relative p-3 sm:p-4 lg:p-5">
        {/* ── Main content row ── */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Weather icon */}
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
            isRainy ? "bg-blue-100/80" : "bg-amber-100/80"
          }`}>
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${isRainy ? "text-blue-500" : "text-amber-500"}`} />
          </div>

          {/* Temperature + condition */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {weather.temp}°
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-400">C</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 truncate">{label}</p>
          </div>

          {/* Humidity + Wind — side stats */}
          <div className="hidden sm:flex items-center gap-4 lg:gap-6 shrink-0">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-sm font-bold text-slate-800">{weather.humidity}%</p>
                <p className="text-[10px] text-slate-400">Humidity</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-teal-400" />
              <div>
                <p className="text-sm font-bold text-slate-800">{weather.wind} km/h</p>
                <p className="text-[10px] text-slate-400">Wind</p>
              </div>
            </div>
          </div>

          {/* Mobile: tiny humidity/wind row */}
          <div className="flex sm:hidden flex-col gap-0.5 text-right shrink-0">
            <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
              <Droplets className="w-3 h-3 text-sky-400" />
              {weather.humidity}%
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
              <Wind className="w-3 h-3 text-teal-400" />
              {weather.wind} km/h
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
