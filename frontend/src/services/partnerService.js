/**
 * services/partnerService.js
 * --------------------------------------------------
 * Axios-based API service for partner dashboards.
 *
 *  - getPartnerProfile(token)
 *  - updatePartnerProfile(token, payload)
 *  - uploadShopImage(token, base64DataUri)
 *  - getPartnerRewards(token, partnerId)
 *  - createReward(token, payload)
 *  - updateReward(token, rewardId, payload)
 *  - deleteReward(token, rewardId)
 *  - redeemTokens(token, { cyclistId, tokens })
 * --------------------------------------------------
 */

import { axiosClient } from "./axiosClient.js";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function authHeader(token) {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

export async function getPartnerProfile(token) {
  const { data } = await axiosClient.get(`${API_BASE}/partner/profile`, authHeader(token));
  return data?.data !== undefined ? data.data : data;
}

export async function updatePartnerProfile(token, payload) {
  const { data } = await axiosClient.patch(
    `${API_BASE}/partner/profile`,
    payload,
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

/** Get partner bank details only (GET /api/partner/bank-details). All calls use axiosClient + JWT (Requirement iv). */
export async function getBankDetails(token) {
  const { data } = await axiosClient.get(`${API_BASE}/partner/bank-details`, authHeader(token));
  return data?.data !== undefined ? data.data : data;
}

/** Save or update partner bank details (PUT; partial updates supported). */
export async function updateBankDetails(token, payload) {
  const { data } = await axiosClient.put(
    `${API_BASE}/partner/bank-details`,
    payload,
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

/** Clear partner bank details (DELETE /api/partner/bank-details). */
export async function deleteBankDetails(token) {
  const { data } = await axiosClient.delete(`${API_BASE}/partner/bank-details`, authHeader(token));
  return data?.data !== undefined ? data.data : data;
}

export async function uploadShopImage(token, base64DataUri) {
  const { data } = await axiosClient.post(
    `${API_BASE}/partner/upload-image`,
    { image: base64DataUri },
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

export async function getPartnerRewards(token, partnerId) {
  const { data } = await axiosClient.get(
    `${API_BASE}/rewards/partner/${partnerId}`,
    authHeader(token)
  );
  // Backend uses responseFormatter: { success, message, data }. Return the payload array.
  return Array.isArray(data?.data) ? data.data : data ?? [];
}

export async function createReward(token, payload) {
  const { data } = await axiosClient.post(
    `${API_BASE}/rewards`,
    payload,
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

export async function updateReward(token, rewardId, payload) {
  const { data } = await axiosClient.patch(
    `${API_BASE}/rewards/${rewardId}`,
    payload,
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

export async function deleteReward(token, rewardId) {
  const { data } = await axiosClient.delete(
    `${API_BASE}/rewards/${rewardId}`,
    authHeader(token)
  );
  return data;
}

export async function redeemTokens(token, { cyclistId, tokens }) {
  const { data } = await axiosClient.patch(
    `${API_BASE}/tokens/redeem`,
    { cyclistId, tokens },
    authHeader(token)
  );
  return data;
}

/** Confirm checkout from scanned QR payload (partner). */
export async function confirmRedeem(token, payload) {
  const { data } = await axiosClient.post(
    `${API_BASE}/redeem/confirm`,
    payload,
    authHeader(token)
  );
  return data;
}

export async function getMyPayouts(token) {
  const { data } = await axiosClient.get(`${API_BASE}/partner/payouts`, authHeader(token));
  return data;
}

/** Partner earnings summary: available balance, payouts, payout requests. Normalized so Payment History always gets payouts array. */
export async function getPartnerEarnings(token) {
  const { data: res } = await axiosClient.get(`${API_BASE}/partner/earnings`, authHeader(token));
  const raw = res?.data !== undefined ? res.data : res;
  if (!raw || typeof raw !== "object") {
    return { availableBalance: 0, payouts: [], payoutRequests: [] };
  }
  return {
    availableBalance: Number(raw.availableBalance) || 0,
    payouts: Array.isArray(raw.payouts) ? raw.payouts : [],
    payoutRequests: Array.isArray(raw.payoutRequests) ? raw.payoutRequests : [],
  };
}

/** Create a payout request for the current partner */
export async function createPayoutRequest(token, amount) {
  const { data } = await axiosClient.post(
    `${API_BASE}/partner/payout-requests`,
    { amount },
    authHeader(token)
  );
  return data?.data !== undefined ? data.data : data;
}

/** Get partner's recent checkouts with pagination. */
export async function getPartnerCheckouts(token, { page = 1, limit = 10 } = {}) {
  const { data } = await axiosClient.get(
    `${API_BASE}/partner/checkouts`,
    { params: { page, limit }, ...authHeader(token) }
  );
  // Backend returns { success, data: checkouts[], pagination: { total, page, limit, totalPages } }. Normalise to { checkouts, total }.
  const list = Array.isArray(data?.data) ? data.data : [];
  const total = data?.pagination?.total ?? 0;
  return { checkouts: list, total };
}

/** Get partner scan stats (scans today, tokens redeemed today, success rate). */
export async function getPartnerScanStats(token) {
  const { data } = await axiosClient.get(`${API_BASE}/partner/scan-stats`, authHeader(token));
  return data?.data !== undefined ? data.data : data;
}

/** Get partner's most recent redemptions for dashboard card (cyclistName, createdAt, tokens). */
export async function getPartnerRecentRedemptions(token, { limit = 5 } = {}) {
  const { data } = await axiosClient.get(
    `${API_BASE}/partner/recent-redemptions`,
    { params: { limit }, ...authHeader(token) }
  );
  // Backend uses responseFormatter: { success, message, data }. Return the payload so data.redemptions is defined.
  return data?.data !== undefined ? data.data : data;
}

