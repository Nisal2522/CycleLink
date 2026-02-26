export const ROLES = ["cyclist", "partner", "admin"];

export const ROUTE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const HAZARD_TYPES = ["pothole", "construction", "accident", "flooding", "other"];

export const LIMITS = {
  ROUTES_ADMIN: 500,
  ROUTES_PUBLIC: 100,
  HAZARDS_LIST: 200,
  MESSAGES_PAGE: 50,
  MESSAGES_MAX: 100,
  RIDES_HISTORY: 100,
  LEADERBOARD: 5,
  SEARCH_USERS: 20,
  SEARCH_USERS_MAX: 50,
};

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Cyclist stats: kg CO₂ saved per km; tokens earned per km */
export const CO2_PER_KM = 0.21;
export const TOKENS_PER_KM = 10;

/** Max distance (km) per single ride update */
export const MAX_DISTANCE_KM = 500;

export const USER_GROWTH_PERIODS = {
  THIS_MONTH: "thismonth",
  THIS_YEAR: "thisyear",
};
