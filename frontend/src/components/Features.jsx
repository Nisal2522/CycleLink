/**
 * Features.jsx
 * --------------------------------------------------
 * Displays the three core features of CycleLink
 * in a responsive card grid.
 *
 * Cards:
 *   1. Safety-First Navigation  (highlighted — primary bg + shield badge)
 *   2. Real-time Traffic Alerts
 *   3. Eco-Token Rewards
 *
 * The first card is intentionally highlighted with the
 * primary colour and a "Safety" shield badge per the
 * design requirements.
 * --------------------------------------------------
 */

import { ShieldCheck, Bell, Coins, Zap } from "lucide-react";
import FadeIn from "./FadeIn";

// Feature card data
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Safety-First Navigation",
    description:
      "AI-optimised routes that prioritise bike lanes, well-lit streets, and low-traffic roads so you reach home safely — every time.",
    highlight: true, // renders with primary background + safety badge
  },
  {
    icon: Bell,
    title: "Real-time Traffic Alerts",
    description:
      "Instant push-notifications about accidents, road closures, and weather changes so you can reroute before trouble finds you.",
    highlight: false,
  },
  {
    icon: Coins,
    title: "Eco-Token Rewards",
    description:
      "Every kilometre earns eco-tokens. Redeem them for discounts at local cafés, bike shops, and sustainable brands near you.",
    highlight: false,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-slate-50/60 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* ── Section header ── */}
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-4">
              <Zap className="w-3.5 h-3.5" /> Core Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Everything you need for a{" "}
              <span className="text-primary">safer ride</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg">
              Powerful features designed with cyclists in mind — safety, rewards,
              and sustainability woven into every ride.
            </p>
          </div>
        </FadeIn>

        {/* ── Card grid ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <FadeIn key={index} delay={index * 0.12}>
              <div
                className={`group relative rounded-2xl p-7 h-full transition-all duration-300 hover:-translate-y-1 ${
                  feature.highlight
                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                    : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-600 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/40"
                }`}
              >
                {/* Safety badge (only on highlighted card) */}
                {feature.highlight && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-white">
                    <ShieldCheck className="w-3 h-3" /> Safety
                  </span>
                )}

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
                    feature.highlight
                      ? "bg-white/20 backdrop-blur"
                      : "bg-primary/10"
                  }`}
                >
                  <feature.icon
                    className={`w-7 h-7 ${
                      feature.highlight ? "text-white" : "text-primary"
                    }`}
                  />
                </div>

                {/* Title */}
                <h3
                  className={`text-xl font-bold mb-3 ${
                    feature.highlight ? "text-white" : "text-slate-900 dark:text-white"
                  }`}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className={`leading-relaxed text-[15px] ${
                    feature.highlight ? "text-white/80" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
