/**
 * services/hazardService.js
 * --------------------------------------------------
 * Axios-based API service for hazard data.
 * Uses relative URLs so Vite's dev-server proxy forwards to the backend.
 *
 *   getHazards()                          → GET    /api/hazards
 *   getHazardMarkers()                    → GET    /api/hazards/markers
 *   reportHazard(token, hazardData)       → POST   /api/hazards/report
 *   updateHazard(token, id, updates)      → PATCH  /api/hazards/:id
 *   deleteHazard(token, id)               → DELETE /api/hazards/:id
 * --------------------------------------------------
 */

import { axiosClient } from "./axiosClient.js";

const BASE = import.meta.env.VITE_API_URL ?? "";
const API_URL = BASE ? `${BASE}/hazards` : "/api/hazards";

/** Helper — creates auth headers from JWT token */
function authHeader(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

/**
 * Fetch all active hazards (public endpoint — full payload).
 */
export async function getHazards() {
  const { data } = await axiosClient.get(API_URL);
  return data;
}

/**
 * Lean marker fetch — only _id, lat, lng, type, reportedBy.
 * Used by the map to render pins with minimal payload.
 */
export async function getHazardMarkers() {
  const { data } = await axiosClient.get(`${API_URL}/markers`);
  return data;
}

/**
 * Report a new hazard. Body must match DB: lat, lng, type (or category), description.
 * @param {string} token
 * @param {{ lat: number, lng: number, type?: string, category?: string, description?: string }} hazardData
 */
export async function reportHazard(token, hazardData) {
  const body = {
    lat: hazardData.lat,
    lng: hazardData.lng,
    type: hazardData.type ?? hazardData.category ?? "other",
    description: hazardData.description != null ? String(hazardData.description).trim() : "",
  };
  const { data } = await axiosClient.post(
    `${API_URL}/report`,
    body,
    authHeader(token)
  );
  return data;
}

/**
 * Update a hazard's type or description (owner only).
 * @param {string} token
 * @param {string} id — Hazard ObjectId
 * @param {{ type?: string, description?: string }} updates
 */
export async function updateHazard(token, id, updates) {
  const { data } = await axiosClient.patch(
    `${API_URL}/${id}`,
    updates,
    authHeader(token)
  );
  return data;
}

/**
 * Delete a hazard report (owner only).
 * @param {string} token
 * @param {string} id — Hazard ObjectId
 */
export async function deleteHazard(token, id) {
  const { data } = await axiosClient.delete(
    `${API_URL}/${id}`,
    authHeader(token)
  );
  return data;
}

/**
 * Verify a hazard (community validation).
 * @param {string} token
 * @param {string} id — Hazard ObjectId
 * @param {"exists" | "resolved" | "spam"} status — Verification status
 */
export async function verifyHazard(token, id, status) {
  const { data } = await axiosClient.post(
    `${API_URL}/${id}/verify`,
    { status },
    authHeader(token)
  );
  return data;
}

/**
 * Get verification details for a hazard.
 * @param {string} id — Hazard ObjectId
 */
export async function getHazardVerifications(id) {
  const { data } = await axiosClient.get(`${API_URL}/${id}/verifications`);
  return data;
}
