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

router.post("/confirm", protect, asyncHandler(confirmRedeem));

export default router;
