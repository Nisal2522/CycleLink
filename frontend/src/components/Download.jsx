/**
 * Download.jsx
 * --------------------------------------------------
 * Call-to-action section encouraging users to
 * download the CycleLink app.
 *
 * Features:
 *   - Full-width primary-coloured card
 *   - Decorative blurred blobs for depth
 *   - iOS and Android download buttons
 * --------------------------------------------------
 */

import { Smartphone, ArrowRight } from "lucide-react";
import FadeIn from "./FadeIn";

export default function Download() {
  return (
    <section id="download" className="py-20 md:py-28 bg-slate-50/60 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 md:px-16 md:py-20 text-center">
            {/* Decorative background blobs */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-8">
                <Smartphone className="w-8 h-8 text-white" />
              </div>

              {/* Heading */}
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Ready to ride smarter?
              </h2>

              {/* Description */}
              <p className="mt-4 text-white/70 text-lg max-w-md mx-auto">
                Download CycleLink today and join a growing community making
                cities cleaner, one ride at a time.
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap gap-4 justify-center">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-primary font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  Download for iOS <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-white/30 text-white font-bold hover:bg-white/10 transition-all"
                >
                  Download for Android
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
