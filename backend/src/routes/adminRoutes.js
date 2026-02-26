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

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/stats", asyncHandler(getStats));

/**
 * @swagger
 * /admin/user-growth-stats:
 *   get:
 *     summary: Get user growth statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Time period for growth stats
 *     responses:
 *       200:
 *         description: User growth statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/user-growth-stats", asyncHandler(getUserGrowthStats));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/users", asyncHandler(getUsers));

/**
 * @swagger
 * /admin/users/{id}/verify:
 *   patch:
 *     summary: Verify a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User verified successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 */
router.patch("/users/:id/verify", asyncHandler(verifyUser));

/**
 * @swagger
 * /admin/users/{id}/block:
 *   patch:
 *     summary: Block or unblock a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User block status toggled successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 */
router.patch("/users/:id/block", asyncHandler(blockUser));

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: User not found
 */
router.delete("/users/:id", asyncHandler(deleteUser));

/**
 * @swagger
 * /admin/routes:
 *   get:
 *     summary: Get all routes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all routes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Route'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/routes", asyncHandler(getRoutes));

/**
 * @swagger
 * /admin/approved-routes:
 *   get:
 *     summary: Get approved routes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved routes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/approved-routes", asyncHandler(getApprovedRoutes));

/**
 * @swagger
 * /admin/route-issues:
 *   get:
 *     summary: Get route issues
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of route issues
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/route-issues", asyncHandler(getRouteIssues));

/**
 * @swagger
 * /admin/routes/{id}:
 *   delete:
 *     summary: Delete a route
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Route not found
 */
router.delete("/routes/:id", asyncHandler(deleteRoute));

/**
 * @swagger
 * /admin/hazards:
 *   get:
 *     summary: List all hazards
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all hazards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hazard'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/hazards", asyncHandler(getAdminHazards));

/**
 * @swagger
 * /admin/hazards/{id}/resolve:
 *   patch:
 *     summary: Resolve a hazard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hazard ID
 *     responses:
 *       200:
 *         description: Hazard resolved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Hazard not found
 */
router.patch("/hazards/:id/resolve", asyncHandler(resolveAdminHazard));

/**
 * @swagger
 * /admin/hazards/{id}:
 *   delete:
 *     summary: Delete a hazard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hazard ID
 *     responses:
 *       200:
 *         description: Hazard deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Hazard not found
 */
router.delete("/hazards/:id", asyncHandler(deleteAdminHazard));

/**
 * @swagger
 * /admin/pending-routes:
 *   get:
 *     summary: Get pending routes awaiting approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending routes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/pending-routes", asyncHandler(getPendingRoutes));

/**
 * @swagger
 * /admin/approve-route/{id}:
 *   patch:
 *     summary: Approve a route
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Route not found
 */
router.patch("/approve-route/:id", asyncHandler(approveRoute));

/**
 * @swagger
 * /admin/reject-route/{id}:
 *   patch:
 *     summary: Reject a route
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Route not found
 */
router.patch("/reject-route/:id", asyncHandler(rejectRoute));

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: List all payments
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/payments", asyncHandler(getPayments));

/**
 * @swagger
 * /admin/payouts:
 *   get:
 *     summary: List all payouts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all payouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payout'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/payouts", asyncHandler(getPayouts));

/**
 * @swagger
 * /admin/payouts/export:
 *   get:
 *     summary: Export payouts data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts data exported successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/payouts/export", asyncHandler(getPayoutsExport));

/**
 * @swagger
 * /admin/payouts/calculate:
 *   post:
 *     summary: Calculate payouts for partners
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts calculated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post("/payouts/calculate", asyncHandler(calculatePayouts));

/**
 * @swagger
 * /admin/payouts/{id}:
 *   patch:
 *     summary: Update payout adjustment
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustmentAmount
 *             properties:
 *               adjustmentAmount:
 *                 type: number
 *                 description: Adjustment amount for the payout
 *               adjustmentNote:
 *                 type: string
 *                 description: Optional note explaining the adjustment
 *     responses:
 *       200:
 *         description: Payout adjustment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout not found
 */
router.patch(
  "/payouts/:id",
  validate(updatePayoutAdjustmentSchema),
  asyncHandler(updatePayoutAdjustment)
);

/**
 * @swagger
 * /admin/payouts/{id}/process:
 *   post:
 *     summary: Process a payout
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID
 *     responses:
 *       200:
 *         description: Payout processed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout not found
 */
router.post("/payouts/:id/process", asyncHandler(processPayout));

/**
 * @swagger
 * /admin/payout-requests:
 *   get:
 *     summary: List all payout requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all payout requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PayoutRequest'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get("/payout-requests", asyncHandler(getPayoutRequests));

/**
 * @swagger
 * /admin/payout-requests/{id}/payhere-init:
 *   get:
 *     summary: Initialize PayHere payment for a payout request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout request ID
 *     responses:
 *       200:
 *         description: PayHere initialization data returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout request not found
 */
router.get("/payout-requests/:id/payhere-init", asyncHandler(getPayhereInit));

/**
 * @swagger
 * /admin/payout-requests/{id}/approve:
 *   post:
 *     summary: Approve a payout request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout request ID
 *     responses:
 *       200:
 *         description: Payout request approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout request not found
 */
router.post("/payout-requests/:id/approve", asyncHandler(approvePayoutRequest));

/**
 * @swagger
 * /admin/payout-requests/{id}/reject:
 *   post:
 *     summary: Reject a payout request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rejectionReason
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 description: Reason for rejecting the payout request
 *     responses:
 *       200:
 *         description: Payout request rejected successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout request not found
 */
router.post(
  "/payout-requests/:id/reject",
  validate(rejectPayoutRequestSchema),
  asyncHandler(rejectPayoutRequest)
);

export default router;
