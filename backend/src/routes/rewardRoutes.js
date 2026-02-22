/**
 * routes/rewardRoutes.js
 * --------------------------------------------------
 * Partner reward management routes.
 *
 * POST   /api/rewards               → createReward (partner only)
 * GET    /api/rewards/partner/:id   → getPartnerRewards (partner only)
 * PATCH  /api/rewards/:id           → updateReward (partner only)
 * DELETE /api/rewards/:id           → deleteReward (partner only)
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { partnerOnly } from "../middleware/role.js";
import {
  createReward,
  getPartnerRewards,
  updateReward,
  deleteReward,
} from "../controllers/rewardController.js";

const router = express.Router();

// 🔒 All reward management requires partner role
router.use(protect, partnerOnly);

router.post("/", asyncHandler(createReward));
router.get("/partner/:id", asyncHandler(getPartnerRewards));
router.patch("/:id", asyncHandler(updateReward));
router.delete("/:id", asyncHandler(deleteReward));

export default router;

