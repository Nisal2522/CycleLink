/**
 * Hero.jsx
 * --------------------------------------------------
 * Landing page hero section with two-column layout.
 *
 * Left  : Bold headline, description, inline email
 *         capture form, and social-proof strip.
 * Right : Realistic phone mock-up showing the
 *         CycleLink app UI (safety score & tokens).
 *
 * Props:
 *   - onOpenSignUp : function(email?) — opens the
 *     sign-up modal, optionally pre-filling email
 * --------------------------------------------------
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bike,
  ShieldCheck,
  Coins,
  ArrowRight,
  Leaf,
  Users,
  Star,
  Mail,
} from "lucide-react";
import FadeIn from "./FadeIn";

export default function Hero() {
  const [heroEmail, setHeroEmail] = useState("");
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24 bg-gradient-to-br from-slate-50 via-white to-primary-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Decorative background blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        {/* ── Left: Copy ── */}
        <div className="relative z-10">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-6">
              <Leaf className="w-3.5 h-3.5" /> Eco-Friendly Cycling Platform
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white">
              Ride Safe Routes.{" "}
              <span className="text-primary">Earn Green Rewards.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
              CycleLink maps the safest bicycle routes in your city, warns you
              about real-time hazards, and rewards every pedal stroke with
              eco-tokens redeemable at local partner shops.
            </p>
          </FadeIn>

          {/* ── Inline email capture form ── */}
          <FadeIn delay={0.3}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/login?mode=signup&email=${encodeURIComponent(heroEmail)}`);
              }}
              className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-11 pr-4 py-3.5 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-white font-semibold shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              >
                Join the Movement <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </FadeIn>

          {/* Social proof */}
          <FadeIn delay={0.4}>
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {["bg-primary-300", "bg-primary-400", "bg-primary-500", "bg-primary-200"].map(
                  (bg, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full ${bg} border-2 border-white flex items-center justify-center`}
                    >
                      <Users className="w-3.5 h-3.5 text-white" />
                    </div>
                  )
                )}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Loved by <strong className="text-slate-700 dark:text-slate-300">50 000+</strong>{" "}
                  cyclists
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ── Right: Phone mock-up ── */}
        <FadeIn delay={0.2} direction="left">
          <div className="relative flex justify-center md:justify-end">
            {/* Glow behind the phone */}
            <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-3xl scale-90" />

            {/* Phone frame */}
            <div className="relative w-[280px] sm:w-[300px] aspect-[9/18] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl ring-1 ring-white/10">
              {/* Screen content */}
              <div className="w-full h-full rounded-[2rem] bg-gradient-to-b from-primary/90 via-primary/70 to-primary-700 overflow-hidden flex flex-col items-center justify-between p-6">
                {/* Status bar */}
                <div className="w-full flex items-center justify-between">
                  <span className="text-white/80 text-[11px] font-medium">
                    9:41
                  </span>
                  <div className="w-20 h-5 bg-black/40 rounded-full" />
                  <div className="flex gap-1">
                    <div className="w-4 h-2 rounded-sm bg-white/60" />
                  </div>
                </div>

                {/* App branding */}
                <div className="text-center space-y-3">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Bike className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white text-lg font-bold">CycleLink</h3>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Your safe route is ready
                  </p>
                </div>

                {/* Info cards */}
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-2">
                    <ShieldCheck className="w-4 h-4 text-green-300" />
                    <span className="text-white text-[11px] font-medium">
                      Safety Score: 96%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-xl px-3 py-2">
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span className="text-white text-[11px] font-medium">
                      +12 Eco-Tokens Earned
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
