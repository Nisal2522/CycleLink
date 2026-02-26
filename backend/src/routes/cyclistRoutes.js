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

/**
 * @swagger
 * /cyclist/partner-count:
 *   get:
 *     summary: Get partner shop count
 *     description: Returns the total number of registered partner shops. No authentication required.
 *     tags: [Cyclist]
 *     responses:
 *       200:
 *         description: Partner count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           example: 24
 */
router.get("/partner-count",        asyncHandler(getPartnerCount));

/**
 * @swagger
 * /cyclist/partners:
 *   get:
 *     summary: Get partner shop list
 *     description: Returns a list of all registered partner shops with their details. No authentication required.
 *     tags: [Cyclist]
 *     responses:
 *       200:
 *         description: Partner shops retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 */
router.get("/partners",             asyncHandler(getPartnerShops));

/**
 * @swagger
 * /cyclist/partners/{id}/rewards:
 *   get:
 *     summary: Get rewards for a specific partner shop
 *     description: Returns a list of active rewards offered by the specified partner shop. No authentication required.
 *     tags: [Cyclist]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Partner shop user ID
 *         schema:
 *           type: string
 *           example: 665f1a2b3c4d5e6f7a8b9c0d
 *     responses:
 *       200:
 *         description: Partner rewards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reward'
 *       404:
 *         description: Partner not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/partners/:id/rewards", asyncHandler(getShopRewards));

/**
 * @swagger
 * /cyclist/leaderboard:
 *   get:
 *     summary: Get cyclist leaderboard
 *     description: Returns the top cyclists ranked by total distance or tokens. Requires authentication but any role can access.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/leaderboard",          protect, asyncHandler(getLeaderboard)); // Protected but any role

// 🔒 Cyclist-only routes (authentication + cyclist role required)
router.use(protect, cyclistOnly);

/**
 * @swagger
 * /cyclist/rides:
 *   get:
 *     summary: Get ride history
 *     description: Returns the authenticated cyclist's ride history. Supports filtering by time period and searching.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/queryPeriod'
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search term to filter rides
 *     responses:
 *       200:
 *         description: Rides retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/rides",                asyncHandler(getRides));

/**
 * @swagger
 * /cyclist/rides/active:
 *   get:
 *     summary: Get currently active ride
 *     description: Returns the cyclist's currently active ride, if any.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active ride retrieved (or null if none)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       nullable: true
 *                       allOf:
 *                         - $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/rides/active",         asyncHandler(getActiveRide));

/**
 * @swagger
 * /cyclist/rides/start:
 *   post:
 *     summary: Start a new ride
 *     description: Begin a new cycling ride. Optionally associate with a saved route and provide a starting location.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               routeId:
 *                 type: string
 *                 description: Optional saved route ID to follow
 *                 example: 665f1a2b3c4d5e6f7a8b9c0d
 *               startLocation:
 *                 type: string
 *                 description: Optional human-readable start location name
 *                 example: Colombo Fort
 *     responses:
 *       201:
 *         description: Ride started successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Validation error or already have an active ride
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
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/rides/start",         validate(startRideSchema), asyncHandler(startRide));

/**
 * @swagger
 * /cyclist/rides/{id}/end:
 *   post:
 *     summary: End an active ride
 *     description: Complete an active ride by providing the distance traveled and optional end details. Tokens and CO2 savings are calculated automatically.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distance
 *             properties:
 *               distance:
 *                 type: number
 *                 description: Distance traveled in kilometers
 *                 example: 5.2
 *               endLocation:
 *                 type: string
 *                 description: Optional human-readable end location name
 *                 example: Galle Face
 *               duration:
 *                 type: number
 *                 description: Optional ride duration in minutes
 *                 example: 25
 *     responses:
 *       200:
 *         description: Ride ended successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Validation error
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
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ride not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/rides/:id/end",       validate(endRideSchema), asyncHandler(endRide));

/**
 * @swagger
 * /cyclist/rides/{id}/cancel:
 *   post:
 *     summary: Cancel an active ride
 *     description: Cancel a currently active ride without recording distance or earning tokens.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Ride ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ride cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ride not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/rides/:id/cancel",    asyncHandler(cancelRide));

/**
 * @swagger
 * /cyclist/stats:
 *   get:
 *     summary: Get cyclist statistics
 *     description: Returns aggregated statistics for the authenticated cyclist including total distance, tokens, rides, and CO2 saved.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cyclist stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalDistance:
 *                           type: number
 *                           example: 42.5
 *                         totalRides:
 *                           type: integer
 *                           example: 12
 *                         tokens:
 *                           type: integer
 *                           example: 150
 *                         co2Saved:
 *                           type: number
 *                           example: 8.93
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/stats",                asyncHandler(getStats));

/**
 * @swagger
 * /cyclist/update-distance:
 *   post:
 *     summary: Update distance (legacy)
 *     description: Legacy endpoint to record a ride with distance. Creates a completed ride record directly.
 *     tags: [Cyclist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distance
 *             properties:
 *               distance:
 *                 type: number
 *                 description: Distance in kilometers
 *                 example: 3.8
 *     responses:
 *       200:
 *         description: Distance updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ride'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a cyclist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/update-distance",     asyncHandler(updateDistance));

export default router;
