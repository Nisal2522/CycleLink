/**
 * routes/cyclistRoutes.js
 * --------------------------------------------------
 * Cyclist dashboard API routes (MVC: Routes layer).
 *
 * GET  /api/cyclist/stats           → cyclistController.getStats (cyclist only)
 * POST /api/cyclist/update-distance → cyclistController.updateDistance (cyclist only)
 * GET  /api/cyclist/leaderboard     → cyclistController.getLeaderboard (protected)
 * GET  /api/cyclist/partners        → getPartnerShops (public)
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { cyclistOnly } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import {
  getStats,
  updateDistance,
  getLeaderboard,
  getRides,
  getPartnerCount,
  getPartnerShops,
  getShopRewards,
  startRide,
  endRide,
  getActiveRide,
  cancelRide,
} from "../controllers/cyclistController.js";
import { startRideSchema, endRideSchema } from "../validatons/rideValidation.js";

const router = express.Router();

// 🌐 Public routes (no auth required)
router.get("/partner-count",        asyncHandler(getPartnerCount));
router.get("/partners",             asyncHandler(getPartnerShops));
router.get("/partners/:id/rewards", asyncHandler(getShopRewards));
router.get("/leaderboard",          protect, asyncHandler(getLeaderboard)); // Protected but any role

// 🔒 Cyclist-only routes (authentication + cyclist role required)
router.use(protect, cyclistOnly);

router.get("/rides",                asyncHandler(getRides));
router.get("/rides/active",         asyncHandler(getActiveRide));
router.post("/rides/start",         validate(startRideSchema), asyncHandler(startRide));
router.post("/rides/:id/end",       validate(endRideSchema), asyncHandler(endRide));
router.post("/rides/:id/cancel",    asyncHandler(cancelRide));
router.get("/stats",                asyncHandler(getStats));
router.post("/update-distance",     asyncHandler(updateDistance));

export default router;
