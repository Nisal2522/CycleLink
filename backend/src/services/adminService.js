/**
 * src/services/adminService.js
 * --------------------------------------------------
 * Admin business logic. All User, Route, Hazard, Payment data access here (Controller → Service → Model).
 */

import User from "../models/User.js";
import Route from "../models/Route.js";
import Hazard from "../models/Hazard.js";
import Payment from "../models/Payment.js";
import { LIMITS, MONTH_NAMES, USER_GROWTH_PERIODS } from "../constants.js";

const userCollection = User.collection.name;

export async function getStats() {
  const [totalUsers, totalPartners, totalRoutes, totalHazards] = await Promise.all([
    User.countDocuments({ role: "cyclist" }),
    User.countDocuments({ role: "partner" }),
    Route.countDocuments(),
    Hazard.countDocuments(),
  ]);
  const totalAdmins = await User.countDocuments({ role: "admin" });
  return {
    totalUsers: totalUsers + totalPartners + totalAdmins,
    totalCyclists: totalUsers,
    totalPartners,
    totalRoutes,
    totalHazards,
  };
}

export async function getUsers() {
  const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
  return users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    shopName: u.shopName || null,
    isVerified: u.isVerified ?? false,
    isBlocked: u.isBlocked ?? false,
    status: u.isBlocked ? "Blocked" : (u.role === "partner" && !u.isVerified ? "Pending" : "Active"),
    partnerTotalRedemptions: u.partnerTotalRedemptions ?? 0,
    createdAt: u.createdAt,
  }));
}

export async function verifyUser(userId) {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  user.isVerified = true;
  await user.save();
  return { _id: user._id, isVerified: true, message: "User verified" };
}

export async function blockUser(userId, block) {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Cannot block an admin");
    err.statusCode = 403;
    throw err;
  }
  user.isBlocked = block !== false;
  await user.save();
  return { _id: user._id, isBlocked: user.isBlocked, message: user.isBlocked ? "User blocked" : "User unblocked" };
}

export async function deleteUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Cannot delete an admin");
    err.statusCode = 403;
    throw err;
  }
  await User.findByIdAndDelete(userId);
  return { message: "User deleted" };
}

export async function getUserGrowthStats(period = "thisYear") {
  const p = period.toLowerCase();
  const now = new Date();
  let start;
  let labels = [];
  let periodKeys = [];
  if (p === USER_GROWTH_PERIODS.THIS_MONTH) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      periodKeys.push(
        now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0")
      );
      labels.push("Day " + d);
    }
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    for (let m = 1; m <= 12; m++) {
      periodKeys.push(now.getFullYear() + "-" + String(m).padStart(2, "0"));
      labels.push(MONTH_NAMES[m - 1]);
    }
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const agg = await User.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, role: { $in: ["cyclist", "partner"] } } },
    {
      $group: {
        _id: {
          period:
            p === USER_GROWTH_PERIODS.THIS_MONTH
              ? { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
              : { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          role: "$role",
        },
        count: { $sum: 1 },
      },
    },
  ]);
  const countByPeriodAndRole = {};
  agg.forEach((row) => {
    const key = row._id.period;
    if (!countByPeriodAndRole[key]) countByPeriodAndRole[key] = { cyclist: 0, partner: 0 };
    if (row._id.role === "cyclist") countByPeriodAndRole[key].cyclist = row.count;
    if (row._id.role === "partner") countByPeriodAndRole[key].partner = row.count;
  });
  const userData = periodKeys.map((k) => countByPeriodAndRole[k]?.cyclist ?? 0);
  const partnerData = periodKeys.map((k) => countByPeriodAndRole[k]?.partner ?? 0);
  return { labels, userData, partnerData };
}

export async function getRoutes() {
  return Route.aggregate([
    { $sort: { createdAt: -1 } },
    { $limit: LIMITS.ROUTES_ADMIN },
    {
      $addFields: {
        _creatorIdLookup: {
          $cond: {
            if: { $eq: [{ $type: "$creatorId" }, "objectId"] },
            then: "$creatorId",
            else: { $convert: { input: "$creatorId", to: "objectId", onError: null, onNull: null } },
          },
        },
      },
    },
    { $lookup: { from: userCollection, localField: "_creatorIdLookup", foreignField: "_id", as: "creatorDoc" } },
    { $addFields: { _firstCreator: { $arrayElemAt: ["$creatorDoc", 0] } } },
    {
      $addFields: {
        creatorId: {
          $cond: {
            if: { $gt: [{ $size: "$creatorDoc" }, 0] },
            then: { _id: "$_firstCreator._id", name: "$_firstCreator.name", email: "$_firstCreator.email" },
            else: { _id: "$_creatorIdLookup" },
          },
        },
      },
    },
    { $project: { creatorDoc: 0, _firstCreator: 0, _creatorIdLookup: 0 } },
  ]);
}

export async function getApprovedRoutes() {
  return Route.find({
    $or: [{ status: "approved" }, { status: { $exists: false } }],
  })
    .populate("creatorId", "name email")
    .sort({ createdAt: -1 })
    .lean()
    .limit(LIMITS.ROUTES_ADMIN);
}

export async function getPendingRoutes() {
  return Route.find({ status: "pending" })
    .populate("creatorId", "name email")
    .sort({ createdAt: -1 })
    .lean();
}

export async function getRouteIssues() {
  const routes = await Route.find({ $or: [{ status: "approved" }, { status: { $exists: false } }] })
    .lean()
    .limit(LIMITS.ROUTES_ADMIN);
  const issuesByRoute = {};
  for (const r of routes) {
    issuesByRoute[r._id.toString()] = {
      inaccuratePath: false,
      safetyIssue: false,
      duplicate: false,
      junk: false,
      hazardCount: 0,
      duplicateGroup: [],
      detectedIssue: null,
      suggestion: null,
    };
  }
  return issuesByRoute;
}

export async function deleteRoute(routeId) {
  const route = await Route.findByIdAndDelete(routeId);
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Route deleted" };
}

export async function approveRoute(routeId) {
  const route = await Route.findByIdAndUpdate(routeId, { status: "approved" }, { new: true, runValidators: true });
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }
  return { _id: route._id, status: "approved", message: "Route approved" };
}

export async function rejectRoute(routeId) {
  const route = await Route.findByIdAndUpdate(routeId, { status: "rejected" }, { new: true, runValidators: true });
  if (!route) {
    const err = new Error("Route not found");
    err.statusCode = 404;
    throw err;
  }
  return { _id: route._id, status: "rejected", message: "Route rejected" };
}

export async function getAdminHazards() {
  const raw = await Hazard.find({ active: true })
    .select("lat lng type description reportedBy createdAt")
    .populate("reportedBy", "name email")
    .sort({ createdAt: -1 })
    .lean()
    .limit(LIMITS.ROUTES_ADMIN);
  return raw.map((h) => ({
    _id: h._id,
    lat: h.lat,
    lng: h.lng,
    type: h.type ?? "other",
    description: h.description != null ? String(h.description) : "",
    reportedBy:
      h.reportedBy && typeof h.reportedBy === "object"
        ? { _id: h.reportedBy._id, name: h.reportedBy.name ?? null, email: h.reportedBy.email ?? null }
        : null,
    createdAt: h.createdAt,
  }));
}

export async function resolveAdminHazard(hazardId) {
  const hazard = await Hazard.findByIdAndUpdate(hazardId, { active: false }, { new: true, runValidators: true });
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  return { _id: hazard._id, active: false, message: "Hazard marked as resolved" };
}

export async function deleteAdminHazard(hazardId) {
  const hazard = await Hazard.findByIdAndDelete(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  return { message: "Hazard deleted", _id: hazardId };
}

export async function getPayments() {
  const payments = await Payment.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .lean();
  return Array.isArray(payments) ? payments : [];
}
