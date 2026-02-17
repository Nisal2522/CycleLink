/**
 * routes/routeRoutes.js
 * --------------------------------------------------
 * Saved routes API (MVC: Routes layer).
 *
 * POST   /api/routes     → routeController.createRoute (protected)
 * GET    /api/routes     → routeController.getRoutes (public)
 * PATCH  /api/routes/:id → routeController.updateRoute (protected)
 * DELETE /api/routes/:id → routeController.deleteRoute (protected)
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { createRouteSchema, updateRouteSchema, rateRouteSchema } from "../validatons/routeValidation.js";
import {
  createRoute,
  getRoutes,
  getMyRoutes,
  updateRoute,
  deleteRoute,
  rateRoute,
  getRouteRatings,
  deleteRating,
} from "../controllers/routeController.js";

const router = express.Router();

router.post("/", protect, validate(createRouteSchema), asyncHandler(createRoute));
router.get("/", asyncHandler(getRoutes));
router.get("/my-routes", protect, asyncHandler(getMyRoutes));
router.post("/:id/rate", protect, validate(rateRouteSchema), asyncHandler(rateRoute));
router.get("/:id/ratings", asyncHandler(getRouteRatings));
router.delete("/:id/rating", protect, asyncHandler(deleteRating));
router.patch("/:id", protect, validate(updateRouteSchema), asyncHandler(updateRoute));
router.delete("/:id", protect, asyncHandler(deleteRoute));

export default router;