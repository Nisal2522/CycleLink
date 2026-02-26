/**
 * routes/tokenRoutes.js
 * --------------------------------------------------
 * Token-related routes (currently partner redemption).
 *
 * PATCH /api/tokens/redeem → redeemTokens
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { redeemTokens } from "../controllers/transactionController.js";

const router = express.Router();

/**
 * @swagger
 * /tokens/redeem:
 *   patch:
 *     summary: Redeem tokens
 *     description: Deduct tokens from a cyclist's balance as part of a reward redemption. Requires authentication.
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
 *               - cyclistId
 *               - tokens
 *             properties:
 *               cyclistId:
 *                 type: string
 *                 description: ID of the cyclist whose tokens are being redeemed
 *                 example: 665f1a2b3c4d5e6f7a8b9c0d
 *               tokens:
 *                 type: integer
 *                 description: Number of tokens to redeem
 *                 example: 50
 *     responses:
 *       200:
 *         description: Tokens redeemed successfully
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
 *         description: Validation error or insufficient tokens
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
router.patch("/redeem", protect, asyncHandler(redeemTokens));

export default router;
