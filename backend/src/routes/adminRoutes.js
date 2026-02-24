/**
 * routes/adminRoutes.js
 * --------------------------------------------------
 * Super Admin API. All routes: protect + adminOnly. JWT required.
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  rejectPayoutRequestSchema,
  updatePayoutAdjustmentSchema,
} from "../validatons/payoutValidation.js";
import {
  getStats,
  getUsers,
  verifyUser,
  blockUser,
  deleteUser,
  getRoutes,
  getApprovedRoutes,
  deleteRoute,
  getPendingRoutes,
  approveRoute,
  rejectRoute,
  getPayouts,
  getPayoutsExport,
  calculatePayouts,
  updatePayoutAdjustment,
  processPayout,
  getUserGrowthStats,
  getRouteIssues,
  getAdminHazards,
  resolveAdminHazard,
  deleteAdminHazard,
  getPayments,
  getPayoutRequests,
  getPayhereInit,
  approvePayoutRequest,
  rejectPayoutRequest,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/stats", asyncHandler(getStats));
router.get("/user-growth-stats", asyncHandler(getUserGrowthStats));
router.get("/users", asyncHandler(getUsers));
router.patch("/users/:id/verify", asyncHandler(verifyUser));
router.patch("/users/:id/block", asyncHandler(blockUser));
router.delete("/users/:id", asyncHandler(deleteUser));
router.get("/routes", asyncHandler(getRoutes));
router.get("/approved-routes", asyncHandler(getApprovedRoutes));
router.get("/route-issues", asyncHandler(getRouteIssues));
router.delete("/routes/:id", asyncHandler(deleteRoute));
router.get("/hazards", asyncHandler(getAdminHazards));
router.patch("/hazards/:id/resolve", asyncHandler(resolveAdminHazard));
router.delete("/hazards/:id", asyncHandler(deleteAdminHazard));
router.get("/pending-routes", asyncHandler(getPendingRoutes));
router.patch("/approve-route/:id", asyncHandler(approveRoute));
router.patch("/reject-route/:id", asyncHandler(rejectRoute));
router.get("/payments", asyncHandler(getPayments));
router.get("/payouts", asyncHandler(getPayouts));
router.get("/payouts/export", asyncHandler(getPayoutsExport));
router.post("/payouts/calculate", asyncHandler(calculatePayouts));
router.patch(
  "/payouts/:id",
  validate(updatePayoutAdjustmentSchema),
  asyncHandler(updatePayoutAdjustment)
);
router.post("/payouts/:id/process", asyncHandler(processPayout));
router.get("/payout-requests", asyncHandler(getPayoutRequests));
router.get("/payout-requests/:id/payhere-init", asyncHandler(getPayhereInit));
router.post("/payout-requests/:id/approve", asyncHandler(approvePayoutRequest));
router.post(
  "/payout-requests/:id/reject",
  validate(rejectPayoutRequestSchema),
  asyncHandler(rejectPayoutRequest)
);

export default router;
