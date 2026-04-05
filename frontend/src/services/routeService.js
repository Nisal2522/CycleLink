/**
 * services/routeService.js
 * --------------------------------------------------
 * API service for saved routes (community routes).
 *
 *   saveRoute(token, payload)  → POST /api/routes
 *   getRoutes()                → GET  /api/routes
 * --------------------------------------------------
 */

import { axiosClient } from "./axiosClient.js";

const BASE = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE ? `${BASE}/routes` : "/api/routes";

function authHeader(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

/**
 * Save a new route. Payload: { startLocation, endLocation, path, distance, duration?, weatherCondition? }
 */
export async function saveRoute(token, payload) {
  const { data } = await axiosClient.post(API_URL, payload, authHeader(token));
  return data;
}

/**
 * Fetch all public (approved) routes for map / community list.
 */
export async function getRoutes() {
  const { data } = await axiosClient.get(API_URL);
  return data;
}

/**
 * Fetch current user's routes (all statuses) for "My Routes" page with status badges.
 */
export async function getMyRoutes(token) {
  const { data } = await axiosClient.get(`${API_URL}/my-routes`, authHeader(token));
  return data;
}

/**
 * Update a route by ID. Payload: { startLocation?, endLocation?, path?, distance?, duration?, weatherCondition? }
 * Only the creator can update.
 */
export async function updateRoute(token, routeId, payload) {
  const { data } = await axiosClient.patch(`${API_URL}/${routeId}`, payload, authHeader(token));
  return data;
}

/**
 * Delete a route by ID. Only the creator can delete.
 */
export async function deleteRoute(token, routeId) {
  const { data } = await axiosClient.delete(`${API_URL}/${routeId}`, authHeader(token));
  return data;
}

/**
 * Rate a route (add or update rating).
 * @param {string} token - JWT
 * @param {string} routeId - Route ID
 * @param {object} payload - { rating: 1-5, comment?: string }
 */
export async function rateRoute(token, routeId, payload) {
  const { data } = await axiosClient.post(
    `${API_URL}/${routeId}/rate`,
    payload,
    authHeader(token)
  );
  return data;
}

/**
 * Get ratings for a route.
 * @param {string} routeId - Route ID
 */
export async function getRouteRatings(routeId) {
  const { data } = await axiosClient.get(`${API_URL}/${routeId}/ratings`);
  return data;
}

/**
 * Delete user's rating for a route.
 * @param {string} token - JWT
 * @param {string} routeId - Route ID
 */
export async function deleteRating(token, routeId) {
  const { data } = await axiosClient.delete(
    `${API_URL}/${routeId}/rating`,
    authHeader(token)
  );
  return data;
}
