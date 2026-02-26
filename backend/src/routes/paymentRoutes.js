/**
 * routes/paymentRoutes.js
 * PayHere notify is mounted in app.js. No Stripe routes.
 */

import express from "express";
import { markPayoutPaid } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";
import { adminOnly } from "../middleware/role.js";

const router = express.Router();

/**
 * @swagger
 * /payments/payhere/mark-paid:
 *   post:
 *     summary: Mark a payout as paid via PayHere
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payoutRequestId:
 *                 type: string
 *                 description: The payout request ID to mark as paid
 *               paymentId:
 *                 type: string
 *                 description: PayHere payment reference ID
 *     responses:
 *       200:
 *         description: Payout marked as paid successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Payout request not found
 */
// Frontend callback - mark as paid
router.post("/payhere/mark-paid", protect, adminOnly, markPayoutPaid);

export default router;
