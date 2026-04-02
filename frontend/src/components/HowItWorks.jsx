/**
 * HowItWorks.jsx
 * --------------------------------------------------
 * A three-step visual section that explains
 * the CycleLink user journey:
 *
 *   Step 1 — Ride  : Pick the safest route and go
 *   Step 2 — Earn  : Collect eco-tokens automatically
 *   Step 3 — Redeem: Spend tokens at partner shops
 *
 * Features a connecting gradient line on desktop
 * and hover-rotation animation on step icons.
 * --------------------------------------------------
 */

import { Route, Coins, Gift, Trophy } from "lucide-react";
import FadeIn from "./FadeIn";

// Step data
const STEPS = [
  {
    number: "01",
    icon: Route,
    title: "Ride",
    description:
      "Open CycleLink, pick the safest route, and start pedalling. The app guides you turn-by-turn.",
    color: "bg-blue-500",
  },
  {
    number: "02",
    icon: Coins,
    title: "Earn",
    description:
      "Every kilometre generates eco-tokens automatically tracked in your wallet — no extra steps needed.",
    color: "bg-primary",
  },
  {
    number: "03",
    icon: Gift,
    title: "Redeem",
    description:
      "Spend tokens at 1 200+ partner shops — from coffee to bike gear, your rides pay you back.",
    color: "bg-emerald-500",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* ── Section header ── */}
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-4">
              <Trophy className="w-3.5 h-3.5" /> How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Three steps to{" "}
              <span className="text-primary">greener commutes</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-lg">
              Getting rewarded for cycling has never been easier. Here's how
              CycleLink turns your rides into real value.
            </p>
          </div>
        </FadeIn>

        {/* ── Steps grid ── */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting gradient line (visible on desktop only) */}
          <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-0.5 bg-gradient-to-r from-blue-500 via-primary to-emerald-500 opacity-20" />

          {STEPS.map((step, index) => (
            <FadeIn key={index} delay={index * 0.15}>
              <div className="relative text-center group">
                {/* Tilted icon box */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div
                    className={`w-20 h-20 ${step.color} rounded-3xl rotate-6 group-hover:rotate-12 transition-transform duration-300 flex items-center justify-center shadow-lg`}
                  >
                    <step.icon className="w-9 h-9 text-white -rotate-6 group-hover:-rotate-12 transition-transform duration-300" />
                  </div>
                  {/* Step number badge — pinned to top-right of icon */}
                  <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-[11px] font-extrabold text-slate-700 z-10">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto text-[15px]">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
