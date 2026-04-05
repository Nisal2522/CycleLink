/**
 * services/cyclistService.js
 * --------------------------------------------------
 * Cyclist dashboard API. Uses axiosClient so Authorization is attached from localStorage when token is not passed.
 * --------------------------------------------------
 */

import { axiosClient } from "./axiosClient.js";

const BASE = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE ? `${BASE}/cyclist` : "/api/cyclist";

function authHeader(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

/**
 * Fetch the logged-in cyclist's stats.
 */
export async function getCyclistStats(token) {
  const { data } = await axiosClient.get(`${API_URL}/stats`, authHeader(token));
  return data;
}

/**
 * Legacy: Record a completed ride distance (km) instantly.
 * Backend auto-calculates tokens and CO₂ earned.
 * Optional: startLocation, endLocation, duration for trip history.
 */
export async function updateDistance(token, distance, { startLocation, endLocation, duration } = {}) {
  const body = { distance };
  if (startLocation != null) body.startLocation = startLocation;
  if (endLocation != null) body.endLocation = endLocation;
  if (duration != null) body.duration = duration;
  const { data } = await axiosClient.post(
    `${API_URL}/update-distance`,
    body,
    authHeader(token)
  );
  return data;
}

/**
 * Start a new ride (optionally linked to a saved route).
 * @param {string} token - JWT
 * @param {object} body - { routeId?: string, startLocation?: string }
 */
export async function startRide(token, body = {}) {
  const { data } = await axiosClient.post(
    `${API_URL}/rides/start`,
    body,
    authHeader(token)
  );
  return data;
}

/**
 * End an active ride and finalize stats.
 * @param {string} token - JWT
 * @param {string} rideId - Ride ID
 * @param {object} body - { distance: number, endLocation?: string, duration?: string }
 */
export async function endRide(token, rideId, body) {
  const { data } = await axiosClient.post(
    `${API_URL}/rides/${rideId}/end`,
    body,
    authHeader(token)
  );
  return data;
}

/**
 * Get user's active ride (if any).
 * @param {string} token - JWT
 */
export async function getActiveRide(token) {
  const { data } = await axiosClient.get(
    `${API_URL}/rides/active`,
    authHeader(token)
  );
  return data;
}

/**
 * Cancel an active ride (no stats updated).
 * @param {string} token - JWT
 * @param {string} rideId - Ride ID
 */
export async function cancelRide(token, rideId) {
  const { data } = await axiosClient.post(
    `${API_URL}/rides/${rideId}/cancel`,
    {},
    authHeader(token)
  );
  return data;
}

/**
 * Fetch ride history and summary for the logged-in cyclist.
 * @param {string} token - JWT
 * @param {object} params - { period: 'week'|'month'|'3months'|'all', search?: string }
 */
export async function getRides(token, params = {}) {
  const { data } = await axiosClient.get(`${API_URL}/rides`, {
    ...authHeader(token),
    params: { period: params.period || "week", search: params.search || undefined },
  });
  return data;
}

/**
 * Fetch the top 5 cyclists sorted by totalDistance.
 */
export async function getLeaderboard(token) {
  const { data } = await axiosClient.get(
    `${API_URL}/leaderboard`,
    authHeader(token)
  );
  return data;
}

/**
 * Fetch the total number of partner shops (public).
 */
export async function getPartnerCount() {
  const { data } = await axiosClient.get(`${API_URL}/partner-count`);
  return data;   // { count: number }
}

/**
 * Fetch all partner shops with reward preview (public).
 */
export async function getPartnerShops() {
  const { data } = await axiosClient.get(`${API_URL}/partners`);
  return data;
}

/**
 * Fetch all active rewards for a specific partner shop (public).
 */
export async function getShopRewards(partnerId) {
  const { data } = await axiosClient.get(`${API_URL}/partners/${partnerId}/rewards`);
  return data;   // { partner, rewards }
}
