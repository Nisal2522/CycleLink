/**
 * Stats.jsx
 * --------------------------------------------------
 * "Live Impact" section displaying four key platform
 * metrics in individual cards with coloured icons.
 *
 * Cards:
 *   1. Total CO₂ Saved         (green icon)
 *   2. Total Rides Completed    (primary/magenta icon)
 *   3. Safe Routes Mapped       (teal icon)
 *   4. Safety Score Average     (orange icon)
 *
 * Each card has a rounded coloured icon at the top,
 * a bold stat value, and a descriptive label.
 * --------------------------------------------------
 */

import { TrendingUp, Bike, MapPin, BarChart3 } from "lucide-react";
import FadeIn from "./FadeIn";

// Impact stats data
const IMPACT_STATS = [
  {
    icon: TrendingUp,
    value: "1,245 kg",
    label: "Total CO₂ Saved",
    iconBg: "bg-emerald-500",
  },
  {
    icon: Bike,
    value: "5,600+",
    label: "Total Rides Completed",
    iconBg: "bg-primary",
  },
  {
    icon: MapPin,
    value: "320+",
    label: "Safe Routes Mapped",
    iconBg: "bg-teal-500",
  },
  {
    icon: BarChart3,
    value: "89%",
    label: "Safety Score Average",
    iconBg: "bg-orange-500",
  },
];

export default function Stats() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-rose-50/40 via-white to-slate-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* ── Section header ── */}
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold tracking-wide mb-4">
              <TrendingUp className="w-3.5 h-3.5" /> Live Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Our community&apos;s{" "}
              <span className="text-emerald-600">real impact</span>
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              Every pedal stroke counts. Watch these numbers grow as our riders
              make the planet greener.
            </p>
          </div>
        </FadeIn>

        {/* ── Stats cards grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {IMPACT_STATS.map((stat, index) => (
            <FadeIn key={index} delay={index * 0.1}>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 text-center">
                {/* Coloured icon */}
                <div
                  className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>

                {/* Value */}
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {stat.value}
                </p>

                {/* Label */}
                <p className="mt-1 text-sm text-slate-500 font-medium">
                  {stat.label}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
