/**
 * src/services/payoutService.js — Admin payout & payout-request business logic (Clean Architecture).
 * Requirement ii (Reporting), iv & v (Payout Requests Reject, Manual Adjustments).
 * Controllers only call this layer and format HTTP responses.
 */

import User from "../models/User.js";
import Payout, { TOKEN_VALUE } from "../models/Payout.js";
import PayoutRequest from "../models/PayoutRequest.js";
import Redemption from "../models/Redemption.js";

/** Escape a field for CSV (quotes and commas) */
function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Partner fields to populate from User (includes bankDetails for admin verify-before-approve — Requirement vi).
 * partnerAvailableBalance so admin always sees partner's available amount when processing.
 */
const PARTNER_POPULATE = "name email shopName bankDetails partnerAvailableBalance";

export async function getPayouts() {
  return Payout.find()
    .populate("partnerId", PARTNER_POPULATE)
    .sort({ month: -1, createdAt: -1 })
    .lean();
}

/**
 * Calculate monthly payouts for a given month (YYYY-MM). Creates Payout records from Redemption aggregation.
 */
export async function calculatePayouts(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const err = new Error("month required as YYYY-MM");
    err.statusCode = 400;
    throw err;
  }
  const start = new Date(month + "-01T00:00:00.000Z");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const aggregated = await Redemption.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$partnerId", totalTokens: { $sum: "$tokens" } } },
  ]);
  const results = [];
  for (const row of aggregated) {
    if (row.totalTokens < 1) continue;
    const totalAmount = row.totalTokens * TOKEN_VALUE;
    const existing = await Payout.findOne({ partnerId: row._id, month });
    if (existing) {
      results.push({
        partnerId: row._id,
        month,
        totalTokens: row.totalTokens,
        totalAmount,
        status: "already exists",
      });
      continue;
    }
    const payout = await Payout.create({
      partnerId: row._id,
      month,
      totalTokens: row.totalTokens,
      totalAmount,
      status: "Pending",
    });
    results.push(
      await Payout.findById(payout._id).populate("partnerId", PARTNER_POPULATE).lean()
    );
  }
  return { count: results.length, payouts: results };
}

/**
 * Update a payout's adjustment (before processing). Idempotent; can be called multiple times.
 */
export async function updatePayoutAdjustment(payoutId, { adjustmentAmount, adjustmentNote }) {
  const payout = await Payout.findById(payoutId).populate("partnerId", PARTNER_POPULATE);
  if (!payout) {
    const err = new Error("Payout not found");
    err.statusCode = 404;
    throw err;
  }
  if (payout.status === "Paid") {
    const err = new Error("Cannot adjust a payout that is already processed");
    err.statusCode = 400;
    throw err;
  }
  payout.adjustmentAmount = adjustmentAmount;
  payout.adjustmentNote = adjustmentNote != null ? String(adjustmentNote).trim() : "";
  await payout.save();
  return payout;
}

/**
 * Mark a payout as Paid, set transactionId, and deduct the paid amount from partner's available balance.
 * So Payout Requests and Payout Management both reduce the same balance (one source of truth).
 */
export async function processPayout(payoutId) {
  const payout = await Payout.findById(payoutId).populate("partnerId", PARTNER_POPULATE);
  if (!payout) {
    const err = new Error("Payout not found");
    err.statusCode = 404;
    throw err;
  }
  if (payout.status === "Paid") {
    const err = new Error("Payout already processed");
    err.statusCode = 400;
    throw err;
  }
  const transactionId = "cycle_" + payout._id + "_" + Date.now();
  const payAmount = (payout.totalAmount || 0) + (payout.adjustmentAmount ?? 0);
  payout.status = "Paid";
  payout.transactionId = transactionId;
  await payout.save();

  const partner = await User.findById(payout.partnerId._id).select("partnerAvailableBalance").exec();
  if (partner) {
    partner.partnerAvailableBalance = Math.max(0, (partner.partnerAvailableBalance || 0) - payAmount);
    await partner.save();
  }

  return { _id: payout._id, status: "Paid", transactionId, payout };
}

/**
 * List all payout requests (populated with partner bankDetails for admin — Requirement vi).
 */
export async function getPayoutRequests() {
  return PayoutRequest.find()
    .populate("partnerId", PARTNER_POPULATE)
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Get a single payout request by id (for PayHere init).
 */
export async function getPayoutRequestById(requestId) {
  const request = await PayoutRequest.findById(requestId)
    .populate("partnerId", "name email shopName")
    .lean();
  return request;
}

/**
 * Approve a payout request: mark Paid and deduct amount from partner's available balance.
 */
export async function approvePayoutRequest(requestId) {
  const request = await PayoutRequest.findById(requestId).populate(
    "partnerId",
    PARTNER_POPULATE + " partnerAvailableBalance"
  );
  if (!request) {
    const err = new Error("Payout request not found");
    err.statusCode = 404;
    throw err;
  }
  // Already paid? Skip (idempotent - safe to call multiple times)
  if (request.status === "Paid") {
    console.log("[Payout] Already paid, skipping:", requestId);
    return {
      _id: request._id,
      status: "Paid",
      transactionId: request.transactionId,
      message: "Payout request already processed",
    };
  }
  if (request.status === "Rejected") {
    const err = new Error("Cannot approve a rejected payout request");
    err.statusCode = 400;
    throw err;
  }
  const partner = await User.findById(request.partnerId._id).select(
    "partnerAvailableBalance shopName name"
  );
  if (!partner) {
    const err = new Error("Partner not found");
    err.statusCode = 404;
    throw err;
  }
  if (partner.partnerAvailableBalance < request.amount) {
    const err = new Error("Partner available balance is insufficient for this payout");
    err.statusCode = 400;
    throw err;
  }
  request.status = "Paid";
  request.transactionId = "payoutreq_" + request._id + "_" + Date.now();
  await request.save();
  partner.partnerAvailableBalance = Math.max(
    0,
    (partner.partnerAvailableBalance || 0) - request.amount
  );
  await partner.save();
  return {
    _id: request._id,
    status: "Paid",
    transactionId: request.transactionId,
    message: "Payout request processed successfully",
  };
}

/**
 * Reject a payout request: set status to Rejected and store rejectionReason. No balance deduction (Requirement iv & v).
 */
export async function rejectPayoutRequest(requestId, { rejectionReason }) {
  const request = await PayoutRequest.findById(requestId).populate(
    "partnerId",
    PARTNER_POPULATE
  );
  if (!request) {
    const err = new Error("Payout request not found");
    err.statusCode = 404;
    throw err;
  }
  if (request.status !== "Pending") {
    const err = new Error(
      request.status === "Paid"
        ? "Payout request already paid"
        : "Payout request already rejected"
    );
    err.statusCode = 400;
    throw err;
  }
  request.status = "Rejected";
  request.rejectionReason = (rejectionReason || "").trim();
  await request.save();
  return {
    _id: request._id,
    status: "Rejected",
    rejectionReason: request.rejectionReason,
    message: "Payout request rejected",
  };
}

/**
 * Build CSV string of payouts for export (Requirement ii — Additional Feature).
 * Uses simple CSV escaping; no external library required for professional output.
 */
export async function getPayoutsCsv() {
  const payouts = await Payout.find()
    .populate("partnerId", PARTNER_POPULATE)
    .sort({ month: -1, createdAt: -1 })
    .lean();

  const headers = [
    "Payout ID",
    "Month",
    "Partner ID",
    "Partner Name",
    "Shop Name",
    "Email",
    "Total Tokens",
    "Total Amount (LKR)",
    "Adjustment (LKR)",
    "Adjustment Note",
    "Status",
    "Transaction ID",
    "Created At",
  ];
  const rows = payouts.map((p) => {
    const partner = p.partnerId || {};
    return [
      p._id,
      p.month,
      partner._id || "",
      partner.name || "",
      partner.shopName || "",
      partner.email || "",
      p.totalTokens,
      p.totalAmount,
      p.adjustmentAmount ?? 0,
      (p.adjustmentNote || "").replace(/\r?\n/g, " "),
      p.status,
      p.transactionId || "",
      p.createdAt ? new Date(p.createdAt).toISOString() : "",
    ];
  });
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}
