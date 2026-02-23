/**
 * src/services/cyclistService.js
 * --------------------------------------------------
 * Cyclist dashboard & stats. All User, Reward, Ride model access here (Controller → Service → Model).
 */

import User from "../models/User.js";
import Reward from "../models/Reward.js";
import Ride from "../models/Ride.js";
import Route from "../models/Route.js";
import { ROLES } from "../constants.js";
import { CO2_PER_KM, TOKENS_PER_KM, MAX_DISTANCE_KM, LIMITS } from "../constants.js";

export async function getStats(userId) {
  const user = await User.findById(userId).select(
    "name email tokens totalDistance co2Saved totalRides safetyScore"
  );
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    tokens: user.tokens,
    totalDistance: parseFloat(user.totalDistance.toFixed(2)),
    co2Saved: parseFloat(user.co2Saved.toFixed(2)),
    totalRides: user.totalRides,
    safetyScore: user.safetyScore,
  };
}

/**
 * Legacy: Quick save ride (backward compatibility).
 * Creates an instant completed ride without start/end flow.
 */
export async function updateDistance(userId, body) {
  const { distance, startLocation, endLocation, duration } = body;
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const tokensEarned = Math.round(distance * TOKENS_PER_KM);
  const co2Earned = parseFloat((distance * CO2_PER_KM).toFixed(2));
  user.totalDistance += distance;
  user.co2Saved += co2Earned;
  user.tokens += tokensEarned;
  user.totalRides += 1;
  await user.save();
  await Ride.create({
    cyclistId: userId,
    startLocation: startLocation != null ? String(startLocation).trim() || "—" : "—",
    endLocation: endLocation != null ? String(endLocation).trim() || "—" : "—",
    distance: parseFloat(distance.toFixed(2)),
    durationText: duration != null ? String(duration).trim() : "",
    tokensEarned,
    co2Saved: co2Earned,
    status: "completed", // Mark as completed
    startedAt: new Date(),
    endedAt: new Date(),
  });
  return {
    message: "Ride recorded successfully!",
    tokensEarned,
    co2Earned,
    distance: parseFloat(distance.toFixed(2)),
    totals: {
      tokens: user.tokens,
      totalDistance: parseFloat(user.totalDistance.toFixed(2)),
      co2Saved: parseFloat(user.co2Saved.toFixed(2)),
      totalRides: user.totalRides,
    },
  };
}

/**
 * Start a new ride (optionally linked to a saved route).
 */
export async function startRide(userId, body) {
  const { routeId, startLocation } = body;

  // Check if user already has an active ride
  const activeRide = await Ride.findOne({
    cyclistId: userId,
    status: { $in: ["active", "paused"] },
  });

  if (activeRide) {
    const err = new Error("You already have an active ride. Please end it first.");
    err.statusCode = 400;
    throw err;
  }

  // Validate routeId if provided
  if (routeId) {
    const route = await Route.findById(routeId);
    if (!route) {
      const err = new Error("Route not found");
      err.statusCode = 404;
      throw err;
    }
  }

  const ride = await Ride.create({
    cyclistId: userId,
    routeId: routeId || null,
    startLocation: startLocation || "Current Location",
    startedAt: new Date(),
    distance: 0,
    tokensEarned: 0,
    co2Saved: 0,
    status: "active",
  });

  // Populate route details if linked
  await ride.populate("routeId", "startLocation endLocation distance");

  return ride;
}

/**
 * End an active ride and finalize stats.
 */
export async function endRide(userId, rideId, body) {
  const { distance, endLocation, duration } = body;

  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error("Ride not found");
    err.statusCode = 404;
    throw err;
  }

  if (ride.cyclistId.toString() !== userId.toString()) {
    const err = new Error("You can only end your own rides");
    err.statusCode = 403;
    throw err;
  }

  if (ride.status === "completed" || ride.status === "cancelled") {
    const err = new Error("Ride already ended");
    err.statusCode = 400;
    throw err;
  }

  // Calculate rewards
  const tokensEarned = Math.round(distance * TOKENS_PER_KM);
  const co2Earned = parseFloat((distance * CO2_PER_KM).toFixed(2));

  // Update ride
  ride.status = "completed";
  ride.endedAt = new Date();
  ride.distance = parseFloat(distance.toFixed(2));
  ride.endLocation = endLocation || "Current Location";
  ride.durationText = duration || "";
  ride.tokensEarned = tokensEarned;
  ride.co2Saved = co2Earned;

  await ride.save();

  // Update user stats
  const user = await User.findById(userId);
  user.totalDistance += ride.distance;
  user.co2Saved += co2Earned;
  user.tokens += tokensEarned;
  user.totalRides += 1;
  await user.save();

  return {
    ride,
    rewards: { tokensEarned, co2Earned, distance: ride.distance },
    totals: {
      tokens: user.tokens,
      totalDistance: parseFloat(user.totalDistance.toFixed(2)),
      co2Saved: parseFloat(user.co2Saved.toFixed(2)),
      totalRides: user.totalRides,
    },
  };
}

/**
 * Get user's active ride (if any).
 */
export async function getActiveRide(userId) {
  const ride = await Ride.findOne({
    cyclistId: userId,
    status: { $in: ["active", "paused"] },
  }).populate("routeId", "startLocation endLocation distance");

  return ride;
}

/**
 * Cancel an active ride (no stats updated).
 */
export async function cancelRide(userId, rideId) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error("Ride not found");
    err.statusCode = 404;
    throw err;
  }

  if (ride.cyclistId.toString() !== userId.toString()) {
    const err = new Error("You can only cancel your own rides");
    err.statusCode = 403;
    throw err;
  }

  if (ride.status === "completed" || ride.status === "cancelled") {
    const err = new Error("Ride already ended");
    err.statusCode = 400;
    throw err;
  }

  ride.status = "cancelled";
  ride.endedAt = new Date();
  await ride.save();

  return { message: "Ride cancelled" };
}

export async function getRides(userId, period, search) {
  const now = new Date();
  let startDate = null;
  if (period === "week") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "3months") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 3);
  }
  const match = { cyclistId: userId };
  if (startDate) match.createdAt = { $gte: startDate };
  let rides = await Ride.find(match).sort({ createdAt: -1 }).limit(LIMITS.RIDES_HISTORY).lean();
  if (search) {
    rides = rides.filter(
      (r) =>
        (r.startLocation && r.startLocation.toLowerCase().includes(search)) ||
        (r.endLocation && r.endLocation.toLowerCase().includes(search))
    );
  }
  const summary = rides.reduce(
    (acc, r) => {
      acc.totalDistance += r.distance;
      acc.totalRides += 1;
      acc.totalTokens += r.tokensEarned;
      acc.totalCo2 += r.co2Saved;
      return acc;
    },
    { totalDistance: 0, totalRides: 0, totalTokens: 0, totalCo2: 0 }
  );
  return {
    summary: {
      totalDistance: parseFloat(summary.totalDistance.toFixed(2)),
      totalRides: summary.totalRides,
      totalTokens: summary.totalTokens,
      totalCo2: parseFloat(summary.totalCo2.toFixed(2)),
    },
    rides: rides.map((r) => ({
      _id: r._id,
      startLocation: r.startLocation || "—",
      endLocation: r.endLocation || "—",
      distance: r.distance,
      durationText: r.durationText || null,
      durationMinutes: r.durationMinutes,
      tokensEarned: r.tokensEarned,
      co2Saved: r.co2Saved,
      createdAt: r.createdAt,
    })),
  };
}

export async function getLeaderboard() {
  const leaders = await User.find({ role: ROLES[0] })
    .sort({ totalDistance: -1 })
    .limit(LIMITS.LEADERBOARD)
    .select("name totalDistance co2Saved tokens totalRides");
  return leaders.map((u, idx) => ({
    rank: idx + 1,
    _id: u._id,
    name: u.name,
    totalDistance: parseFloat(u.totalDistance.toFixed(2)),
    co2Saved: parseFloat(u.co2Saved.toFixed(2)),
    tokens: u.tokens,
    totalRides: u.totalRides,
  }));
}

export async function getPartnerCount() {
  const count = await User.countDocuments({ role: "partner" });
  return { count };
}

export async function getPartnerShops() {
  const partners = await User.find({ role: "partner" })
    .select("shopName shopImage location address category")
    .lean();
  const partnerIds = partners.map((p) => p._id);
  const rewards = await Reward.find({
    partnerId: { $in: partnerIds },
    active: true,
  })
    .select("partnerId title tokenCost")
    .sort({ createdAt: -1 })
    .lean();
  const rewardMap = {};
  for (const r of rewards) {
    const pid = r.partnerId.toString();
    if (!rewardMap[pid]) rewardMap[pid] = [];
    rewardMap[pid].push(r);
  }
  return partners.map((p) => ({
    ...p,
    rewardPreview: (rewardMap[p._id.toString()] || []).slice(0, 2),
    totalRewards: (rewardMap[p._id.toString()] || []).length,
  }));
}

export async function getShopRewards(partnerId) {
  const partner = await User.findById(partnerId)
    .select("shopName shopImage location category")
    .lean();
  if (!partner) {
    const err = new Error("Partner shop not found");
    err.statusCode = 404;
    throw err;
  }
  const rewards = await Reward.find({ partnerId, active: true })
    .select("title description tokenCost expiryDate")
    .sort({ tokenCost: 1 })
    .lean();
  return { partner, rewards };
}

export { CO2_PER_KM, TOKENS_PER_KM, MAX_DISTANCE_KM };
