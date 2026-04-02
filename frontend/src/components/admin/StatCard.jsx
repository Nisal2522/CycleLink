/**
 * admin/StatCard.jsx
 * Metric card: icon container, large value, growth indicator, hover lift.
 * Theme: Maroon primary, soft shadows, 0.3s transition.
 */

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

const MAROON = "#80134D";

export default function StatCard({
  icon: Icon,
  label,
  value,
  growthPercent,
  growthLabel,
  color = MAROON,
  delay = 0,
}) {
  const isPositive = growthPercent == null || growthPercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg"
      style={{
        boxShadow: "0 0 0 1px rgba(15,23,42,0.03), 0 2px 4px rgba(15,23,42,0.04)",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.15] transition-opacity duration-300 group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />
      <div className="relative">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
          style={{
            backgroundColor: `${color}18`,
            color,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <p
          className="text-2xl font-bold tracking-tight text-slate-900"
          style={{ backgroundColor: "rgba(128,19,77,0.08)" }}
        >
          <span className="bg-clip-text px-0.5">{value}</span>
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
        {(growthPercent != null || growthLabel) && (
          <div className="mt-2 flex items-center gap-1.5">
            {growthPercent != null &&
              (isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={2.2} />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" strokeWidth={2.2} />
              ))}
            <span
              className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}
            >
              {growthPercent != null ? `${isPositive ? "+" : ""}${growthPercent}%` : ""}
              {growthLabel && (growthPercent != null ? ` ${growthLabel}` : growthLabel)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
