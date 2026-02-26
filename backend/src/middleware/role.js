import asyncHandler from "express-async-handler";
import { ROLES } from "../constants.js";

/**
 * Flexible role checker - allows multiple roles.
 * Usage: roleCheck(["admin", "partner"]) - allows admin OR partner
 *
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @returns {Function} Express middleware
 */
export const roleCheck = (allowedRoles) => {
  // Validate input
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error("roleCheck requires a non-empty array of roles");
  }

  // Validate all roles are valid
  const invalidRoles = allowedRoles.filter(role => !ROLES.includes(role));
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid roles: ${invalidRoles.join(", ")}. Valid roles: ${ROLES.join(", ")}`);
  }

  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Authentication required");
    }

    if (!req.user.role) {
      res.status(403);
      throw new Error("User role not defined");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`
      );
    }

    next();
  });
};

/**
 * Legacy single-role middlewares (kept for backward compatibility).
 * Recommendation: Migrate to roleCheck() for better flexibility.
 */

export const partnerOnly = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "partner") {
    res.status(403);
    throw new Error("Only partners can perform this action");
  }
  next();
});

export const cyclistOnly = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "cyclist") {
    res.status(403);
    throw new Error("Only cyclists can perform this action");
  }
  next();
});

export const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403);
    throw new Error("Access denied — admin only");
  }
  next();
});
