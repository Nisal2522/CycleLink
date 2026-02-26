/**
 * routes/hazardRoutes.js
 * --------------------------------------------------
 * Hazard reporting API routes (MVC: Routes layer).
 *
 * GET    /api/hazards         → hazardController.getHazards
 * POST   /api/hazards/report  → hazardController.reportHazard
 * PATCH  /api/hazards/:id     → hazardController.updateHazard
 * DELETE /api/hazards/:id     → hazardController.deleteHazard
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { roleCheck } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import { reportHazardSchema, updateHazardSchema, verifyHazardSchema } from "../validatons/hazardValidation.js";
import {
  getHazards,
  getHazardMarkers,
  reportHazard,
  updateHazard,
  deleteHazard,
  verifyHazard,
  getHazardVerifications,
  moderateHazard,
  forceDeleteHazard,
  cleanupStaleHazards,
} from "../controllers/hazardController.js";

const router = express.Router();

/**
 * @swagger
 * /hazards:
 *   get:
 *     summary: List all hazards
 *     description: Retrieve a list of all reported hazards. No authentication required.
 *     tags: [Hazards]
 *     responses:
 *       200:
 *         description: Hazards retrieved successfully
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
 *                         $ref: '#/components/schemas/Hazard'
 */
router.get("/", asyncHandler(getHazards));

/**
 * @swagger
 * /hazards/markers:
 *   get:
 *     summary: Get hazard markers
 *     description: Retrieve hazard data formatted as map markers for display on the frontend map. No authentication required.
 *     tags: [Hazards]
 *     responses:
 *       200:
 *         description: Hazard markers retrieved successfully
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
 *                         $ref: '#/components/schemas/Hazard'
 */
router.get("/markers", asyncHandler(getHazardMarkers));

/**
 * @swagger
 * /hazards/report:
 *   post:
 *     summary: Report a new hazard
 *     description: Submit a new hazard report at the given coordinates. Requires authentication.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *             properties:
 *               lat:
 *                 type: number
 *                 description: Latitude of the hazard location
 *                 example: 6.9271
 *               lng:
 *                 type: number
 *                 description: Longitude of the hazard location
 *                 example: 79.8612
 *               type:
 *                 type: string
 *                 enum: [pothole, construction, accident, flooding, other]
 *                 description: Type of hazard
 *                 example: pothole
 *               description:
 *                 type: string
 *                 description: Additional details about the hazard
 *                 example: Large pothole near the intersection
 *     responses:
 *       201:
 *         description: Hazard reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Hazard'
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
 */
router.post("/report", protect, validate(reportHazardSchema), asyncHandler(reportHazard));

/**
 * @swagger
 * /hazards/{id}:
 *   patch:
 *     summary: Update a hazard
 *     description: Update an existing hazard's type or description. Requires authentication.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [pothole, construction, accident, flooding, other]
 *                 example: construction
 *               description:
 *                 type: string
 *                 example: Road construction ongoing for 2 weeks
 *     responses:
 *       200:
 *         description: Hazard updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Hazard'
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
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id", protect, validate(updateHazardSchema), asyncHandler(updateHazard));

/**
 * @swagger
 * /hazards/{id}:
 *   delete:
 *     summary: Delete a hazard
 *     description: Delete a hazard report. Only the original reporter or an admin can delete it. Requires authentication.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     responses:
 *       200:
 *         description: Hazard deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", protect, asyncHandler(deleteHazard));

// Community validation routes

/**
 * @swagger
 * /hazards/{id}/verify:
 *   post:
 *     summary: Verify a hazard
 *     description: Submit a community verification for a hazard (confirm it exists, mark resolved, or flag as spam). Requires authentication.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [exists, resolved, spam]
 *                 description: Verification status to apply
 *                 example: exists
 *     responses:
 *       200:
 *         description: Hazard verification submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Hazard'
 *       400:
 *         description: Validation error or duplicate verification
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
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/verify", protect, validate(verifyHazardSchema), asyncHandler(verifyHazard));

/**
 * @swagger
 * /hazards/{id}/verifications:
 *   get:
 *     summary: Get hazard verifications
 *     description: Retrieve all community verifications for a specific hazard. No authentication required.
 *     tags: [Hazards]
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     responses:
 *       200:
 *         description: Verifications retrieved successfully
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
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [exists, resolved, spam]
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/verifications", asyncHandler(getHazardVerifications));

// Admin moderation routes

/**
 * @swagger
 * /hazards/{id}/moderate:
 *   patch:
 *     summary: Moderate a hazard
 *     description: Admin moderation action to update a hazard's status, active state, or add a moderation note. Requires admin role.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [reported, verified, resolved, invalid]
 *                 description: New status for the hazard
 *                 example: verified
 *               active:
 *                 type: boolean
 *                 description: Whether the hazard is active
 *                 example: true
 *               moderationNote:
 *                 type: string
 *                 description: Admin note explaining the moderation action
 *                 example: Verified by city maintenance team
 *     responses:
 *       200:
 *         description: Hazard moderated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Hazard'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorised — admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/moderate", protect, roleCheck(["admin"]), asyncHandler(moderateHazard));

/**
 * @swagger
 * /hazards/{id}/force:
 *   delete:
 *     summary: Force delete a hazard
 *     description: Permanently delete a hazard from the database. This is an irreversible admin action. Requires admin role.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     responses:
 *       200:
 *         description: Hazard permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorised — admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Hazard not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id/force", protect, roleCheck(["admin"]), asyncHandler(forceDeleteHazard));

/**
 * @swagger
 * /hazards/cleanup:
 *   post:
 *     summary: Cleanup stale hazards
 *     description: Remove or deactivate old hazard reports that are no longer relevant. Requires admin role.
 *     tags: [Hazards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stale hazards cleaned up successfully
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
 *                         removedCount:
 *                           type: integer
 *                           description: Number of hazards cleaned up
 *                           example: 12
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorised — admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/cleanup", protect, roleCheck(["admin"]), asyncHandler(cleanupStaleHazards));

export default router;
