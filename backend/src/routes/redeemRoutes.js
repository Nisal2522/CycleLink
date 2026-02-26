/**
 * routes/redeemRoutes.js
 * --------------------------------------------------
 * QR-based redemption confirmation (partner scans cyclist's QR).
 *
 * POST /api/redeem/confirm → confirmRedeem
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { confirmRedeem } from "../controllers/transactionController.js";

const router = express.Router();

/**
 * @swagger
 * /redeem/confirm:
 *   post:
 *     summary: Confirm QR redemption
 *     description: Confirm a QR-based reward redemption after a partner scans a cyclist's QR code. Requires authentication.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - cyclistId
 *               - tokenAmount
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: ID of the pending redemption transaction
 *                 example: 665f1a2b3c4d5e6f7a8b9c0d
 *               cyclistId:
 *                 type: string
 *                 description: ID of the cyclist redeeming the reward
 *                 example: 665f1a2b3c4d5e6f7a8b9c0e
 *               tokenAmount:
 *                 type: integer
 *                 description: Number of tokens for this redemption
 *                 example: 50
 *               mealName:
 *                 type: string
 *                 description: Name of the meal or item being redeemed
 *                 example: Free Coffee
 *               cyclistName:
 *                 type: string
 *                 description: Display name of the cyclist
 *                 example: John Doe
 *               expiryTime:
 *                 type: string
 *                 format: date-time
 *                 description: Expiry time for the QR code
 *                 example: 2026-03-01T12:00:00.000Z
 *     responses:
 *       200:
 *         description: Redemption confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Redemption'
 *       400:
 *         description: Validation error or expired QR code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/confirm", protect, asyncHandler(confirmRedeem));

export default router;
