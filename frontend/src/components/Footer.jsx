import { Bike, Heart, Twitter, Instagram, Facebook, Github } from "lucide-react";

// Social media links
const SOCIALS = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Github, href: "#", label: "GitHub" },
];

// Footer navigation links
const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Rewards", href: "#how-it-works" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* ── Brand ── */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <a href="#" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Bike className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">
                Cycle<span className="text-primary-300">Link</span>
              </span>
            </a>
            <p className="text-sm text-slate-500 max-w-xs text-center md:text-left">
              Making cities greener, one safe ride at a time.
            </p>
          </div>

          {/* ── Navigation links ── */}
          <div className="flex flex-wrap justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Social icons ── */}
          <div className="flex items-center gap-3">
            {SOCIALS.map((social, index) => (
              <a
                key={index}
                href={social.href}
                aria-label={social.label}
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-primary flex items-center justify-center transition-colors"
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <p>
            &copy; {new Date().getFullYear()} CycleLink. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Made with{" "}
            <Heart className="w-3 h-3 text-primary fill-primary" /> for a
            greener planet
          </p>
        </div>
      </div>
    </footer>
  );
}
