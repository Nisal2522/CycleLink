/**
 * config/nav.js
 * --------------------------------------------------
 * Centralised navigation config for Navbar and Sidebar.
 *
 * Exports:
 *   - getNavLinksForRole(role) → [{ label, to }] for navbar
 *   - ROLE_NAV → { cyclist, partner, admin } each [{ to, label, icon }]
 *   - SHARED_NAV → [{ to, label, icon }] e.g. Home, Settings
 * --------------------------------------------------
 */

import {
  Home,
  Settings,
  Bike,
  Map,
  MapPin,
  Award,
  Clock,
  Trophy,
  CloudSun,
  Store,
  Building2,
  Landmark,
  QrCode,
  DollarSign,
  Megaphone,
  ShieldCheck,
  Users,
  Activity,
  MessageCircle,
} from "lucide-react";

/* ── Navbar: role-specific links (label + to only) ── */
const NAV_LINKS_BY_ROLE = {
  cyclist: [
    { label: "Dashboard", to: "/dashboard" },
    { label: "My Tokens", to: "/dashboard/rewards" },
    { label: "Safe Routes", to: "/dashboard/map" },
    { label: "Messages", to: "/dashboard/messages" },
  ],
  partner: [
    { label: "Dashboard", to: "/partner-dashboard" },
    { label: "Shop Profile", to: "/partner-dashboard/shop-profile" },
    { label: "Bank Settings", to: "/partner-dashboard/bank-settings" },
    { label: "Scan QR", to: "/partner-dashboard/scan" },
    { label: "Earnings", to: "/partner-dashboard/earnings" },
    { label: "Messages", to: "/partner-dashboard/messages" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin-panel" },
    { label: "Users", to: "/admin-panel" },
    { label: "Route Overview", to: "/admin-panel/route-overview" },
    { label: "Messages", to: "/admin-panel/messages" },
  ],
};

export function getNavLinksForRole(role) {
  return NAV_LINKS_BY_ROLE[role] || NAV_LINKS_BY_ROLE.cyclist;
}

/* ── Sidebar: role-specific links with icons ── */
export const ROLE_NAV = {
  cyclist: [
    { to: "/dashboard", label: "Overview", icon: Bike },
    { to: "/dashboard/map", label: "Map", icon: Map },
    { to: "/dashboard/routes", label: "Saved Routes", icon: MapPin },
    { to: "/dashboard/rewards", label: "Rewards", icon: Award },
    { to: "/dashboard/messages", label: "Messages", icon: MessageCircle },
    { to: "/dashboard/history", label: "History", icon: Clock },
    { to: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/dashboard/weather", label: "Weather", icon: CloudSun },
  ],
  partner: [
    { to: "/partner-dashboard", label: "Overview", icon: Store },
    { to: "/partner-dashboard/shop-profile", label: "Shop Profile", icon: Building2 },
    { to: "/partner-dashboard/bank-settings", label: "Bank Settings", icon: Landmark },
    { to: "/partner-dashboard/scan", label: "Scan QR", icon: QrCode },
    { to: "/partner-dashboard/earnings", label: "Earnings", icon: DollarSign },
    { to: "/partner-dashboard/messages", label: "Messages", icon: MessageCircle },
    { to: "/partner-dashboard", label: "Promos", icon: Megaphone },
  ],
  admin: [
    { to: "/admin-panel", label: "Dashboard", icon: ShieldCheck },
    { to: "/admin-panel", label: "Users", icon: Users },
    { to: "/admin-panel/route-overview", label: "Route Overview", icon: Activity },
    { to: "/admin-panel/messages", label: "Messages", icon: MessageCircle },
  ],
};

/* ── Sidebar: shared links (Home, Settings) ── */
export const SHARED_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/settings", label: "Settings", icon: Settings },
];
