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

/**
 * @swagger
 * /routes:
 *   post:
 *     summary: Create a new route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startLocation
 *               - endLocation
 *               - path
 *               - distance
 *             properties:
 *               startLocation:
 *                 type: object
 *                 description: Starting point coordinates
 *               endLocation:
 *                 type: object
 *                 description: Ending point coordinates
 *               path:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of coordinates forming the route path
 *               distance:
 *                 type: number
 *                 description: Route distance in meters
 *               duration:
 *                 type: number
 *                 description: Estimated duration in seconds
 *               weatherCondition:
 *                 type: string
 *                 description: Weather condition at time of creation
 *     responses:
 *       201:
 *         description: Route created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", protect, validate(createRouteSchema), asyncHandler(createRoute));

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: List public approved routes
 *     tags: [Routes]
 *     responses:
 *       200:
 *         description: List of approved public routes
 */
router.get("/", asyncHandler(getRoutes));

/**
 * @swagger
 * /routes/my-routes:
 *   get:
 *     summary: Get the authenticated user's own routes
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of routes belonging to the authenticated user
 *       401:
 *         description: Unauthorized
 */
router.get("/my-routes", protect, asyncHandler(getMyRoutes));

/**
 * @swagger
 * /routes/{id}/rate:
 *   post:
 *     summary: Rate a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value (1-5)
 *               comment:
 *                 type: string
 *                 description: Optional comment for the rating
 *     responses:
 *       200:
 *         description: Route rated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Route not found
 */
router.post("/:id/rate", protect, validate(rateRouteSchema), asyncHandler(rateRoute));

/**
 * @swagger
 * /routes/{id}/ratings:
 *   get:
 *     summary: Get ratings for a route
 *     tags: [Routes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     responses:
 *       200:
 *         description: List of ratings for the route
 *       404:
 *         description: Route not found
 */
router.get("/:id/ratings", asyncHandler(getRouteRatings));

/**
 * @swagger
 * /routes/{id}/rating:
 *   delete:
 *     summary: Delete the authenticated user's own rating on a route
 *     tags: [Routes]
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
 *         description: Rating deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Rating not found
 */
router.delete("/:id/rating", protect, asyncHandler(deleteRating));

/**
 * @swagger
 * /routes/{id}:
 *   patch:
 *     summary: Update a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Route ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startLocation:
 *                 type: object
 *                 description: Updated starting point coordinates
 *               endLocation:
 *                 type: object
 *                 description: Updated ending point coordinates
 *               path:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Updated array of coordinates
 *               distance:
 *                 type: number
 *                 description: Updated distance in meters
 *               duration:
 *                 type: number
 *                 description: Updated duration in seconds
 *               weatherCondition:
 *                 type: string
 *                 description: Updated weather condition
 *     responses:
 *       200:
 *         description: Route updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Route not found
 */
router.patch("/:id", protect, validate(updateRouteSchema), asyncHandler(updateRoute));

/**
 * @swagger
 * /routes/{id}:
 *   delete:
 *     summary: Delete a route
 *     tags: [Routes]
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
 *       404:
 *         description: Route not found
 */
router.delete("/:id", protect, asyncHandler(deleteRoute));

export default router;
