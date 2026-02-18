/**
 * controllers/cyclistController.js
 * --------------------------------------------------
 * Cyclist HTTP layer only. All data access via cyclistService (Controller → Service → Model).
 */

import * as cyclistService from "../services/cyclistService.js";

export async function getStats(req, res) {
  const data = await cyclistService.getStats(req.user._id);
  res.json(data);
}

export async function updateDistance(req, res) {
  const { distance } = req.body;
  if (!distance || typeof distance !== "number" || distance <= 0) {
    res.status(400);
    throw new Error("Distance must be a positive number (in km)");
  }
  if (distance > cyclistService.MAX_DISTANCE_KM) {
    res.status(400);
    throw new Error(`Distance seems too large. Maximum ${cyclistService.MAX_DISTANCE_KM} km per update.`);
  }
  const data = await cyclistService.updateDistance(req.user._id, req.body);
  res.json(data);
}

/**
 * Start a new ride.
 */
export async function startRide(req, res) {
  const data = await cyclistService.startRide(req.user._id, req.body);
  res.status(201).json(data);
}

/**
 * End an active ride.
 */
export async function endRide(req, res) {
  const { distance } = req.body;
  if (!distance || typeof distance !== "number" || distance <= 0) {
    res.status(400);
    throw new Error("Distance must be a positive number (in km)");
  }
  if (distance > cyclistService.MAX_DISTANCE_KM) {
    res.status(400);
    throw new Error(`Distance seems too large. Maximum ${cyclistService.MAX_DISTANCE_KM} km per update.`);
  }
  const data = await cyclistService.endRide(req.user._id, req.params.id, req.body);
  res.json(data);
}

/**
 * Get active ride (if any).
 */
export async function getActiveRide(req, res) {
  const data = await cyclistService.getActiveRide(req.user._id);
  res.json(data);
}

/**
 * Cancel an active ride.
 */
export async function cancelRide(req, res) {
  const data = await cyclistService.cancelRide(req.user._id, req.params.id);
  res.json(data);
}

export async function getRides(req, res) {
  const period = (req.query.period || "week").toLowerCase();
  const search = (req.query.search || "").trim().toLowerCase();
  const data = await cyclistService.getRides(req.user._id, period, search);
  res.json(data);
}

export async function getLeaderboard(req, res) {
  const data = await cyclistService.getLeaderboard();
  res.json(data);
}

export async function getPartnerCount(req, res) {
  const data = await cyclistService.getPartnerCount();
  res.json(data);
}

export async function getPartnerShops(req, res) {
  const data = await cyclistService.getPartnerShops();
  res.json(data);
}

export async function getShopRewards(req, res) {
  const data = await cyclistService.getShopRewards(req.params.id);
  res.json(data);
}
