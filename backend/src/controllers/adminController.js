/**
 * controllers/adminController.js
 * --------------------------------------------------
 * Admin HTTP layer only. All data access via adminService or payoutService (Controller → Service → Model).
 */

import * as adminService from "../services/adminService.js";
import * as payoutService from "../services/payoutService.js";
import { buildPayoutPaymentParams } from "../utils/payhereHelper.js";
import { success } from "../utils/responseFormatter.js";

export async function getStats(req, res) {
  const data = await adminService.getStats();
  res.json(data);
}

export async function getUsers(req, res) {
  const list = await adminService.getUsers();
  res.json(list);
}

export async function verifyUser(req, res) {
  const data = await adminService.verifyUser(req.params.id);
  res.json(data);
}

export async function blockUser(req, res) {
  const data = await adminService.blockUser(req.params.id, req.body.block);
  res.json(data);
}

export async function deleteUser(req, res) {
  const data = await adminService.deleteUser(req.params.id);
  res.json(data);
}

export async function getUserGrowthStats(req, res) {
  const period = (req.query.period || "thisYear").toLowerCase();
  const data = await adminService.getUserGrowthStats(period);
  res.json(data);
}

export async function getRoutes(req, res) {
  const routes = await adminService.getRoutes();
  res.json(routes);
}

export async function getApprovedRoutes(req, res) {
  const routes = await adminService.getApprovedRoutes();
  res.json(routes);
}

export async function getPendingRoutes(req, res) {
  const routes = await adminService.getPendingRoutes();
  res.json(routes);
}

export async function getRouteIssues(req, res) {
  const issuesByRoute = await adminService.getRouteIssues();
  res.json(issuesByRoute);
}

export async function deleteRoute(req, res) {
  const data = await adminService.deleteRoute(req.params.id);
  res.json(data);
}

export async function approveRoute(req, res) {
  const data = await adminService.approveRoute(req.params.id);
  res.json(data);
}

export async function rejectRoute(req, res) {
  const data = await adminService.rejectRoute(req.params.id);
  res.json(data);
}

export async function getAdminHazards(req, res) {
  const hazards = await adminService.getAdminHazards();
  res.json(hazards);
}

export async function resolveAdminHazard(req, res) {
  try {
    const data = await adminService.resolveAdminHazard(req.params.id);
    return res.json(data);
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ message: "Hazard not found", _id: req.params.id });
    throw err;
  }
}

export async function deleteAdminHazard(req, res) {
  try {
    const data = await adminService.deleteAdminHazard(req.params.id);
    return res.json(data);
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ message: "Hazard not found", _id: req.params.id });
    throw err;
  }
}

export async function getPayments(req, res) {
  const payments = await adminService.getPayments();
  res.json(payments);
}

export async function getPayouts(req, res) {
  const payouts = await payoutService.getPayouts();
  res.json(payouts);
}

export async function calculatePayouts(req, res) {
  const { month } = req.body;
  const result = await payoutService.calculatePayouts(month);
  res.json({ message: "Payouts calculated", count: result.count, payouts: result.payouts });
}

export async function updatePayoutAdjustment(req, res) {
  const { adjustmentAmount, adjustmentNote } = req.body;
  const payout = await payoutService.updatePayoutAdjustment(req.params.id, {
    adjustmentAmount,
    adjustmentNote,
  });
  success(res, payout, "Payout adjustment updated");
}

export async function processPayout(req, res) {
  const result = await payoutService.processPayout(req.params.id);
  success(res, {
    _id: result._id,
    status: result.status,
    transactionId: result.transactionId,
    message: "Payout processed successfully",
  });
}

export async function getPayoutsExport(req, res) {
  const csv = await payoutService.getPayoutsCsv();
  const filename = `payouts-export-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

export async function getPayoutRequests(req, res) {
  const requests = await payoutService.getPayoutRequests();
  res.json(requests);
}

/**
 * GET /api/admin/payout-requests/:id/payhere-init — PayHere checkout params for "Approve & Pay".
 * Admin uses these to submit form to PayHere sandbox; on success PayHere notifies us and we mark payout Paid.
 */
export async function getPayhereInit(req, res) {
  const request = await payoutService.getPayoutRequestById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error("Payout request not found");
  }
  if (request.status !== "Pending") {
    res.status(400);
    throw new Error(`Payout request is already ${request.status}`);
  }
  const partner = request.partnerId || {};
  const partnerName = partner.shopName || partner.name || "Partner";
  const partnerEmail = partner.email || "";
  const partnerPhone = partner.phoneNumber || "";
  const partnerAddress = partner.address || "";
  const partnerCity = partner.location || "";
  const { payhereUrl, formData } = buildPayoutPaymentParams({
    orderId: String(request._id),
    amount: request.amount,
    partnerName,
    partnerEmail,
    partnerPhone,
    partnerAddress,
    partnerCity,
  });
  res.json({ payhereUrl, formData });
}

export async function approvePayoutRequest(req, res) {
  const result = await payoutService.approvePayoutRequest(req.params.id);
  success(res, result);
}

export async function rejectPayoutRequest(req, res) {
  const { rejectionReason } = req.body;
  const result = await payoutService.rejectPayoutRequest(req.params.id, { rejectionReason });
  success(res, result);
}
