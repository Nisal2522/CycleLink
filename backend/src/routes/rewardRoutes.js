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

/**
 * @swagger
 * /rewards:
 *   post:
 *     summary: Create a new reward
 *     description: Create a new reward offering for the authenticated partner's shop. Requires partner role.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - tokenCost
 *             properties:
 *               title:
 *                 type: string
 *                 example: Free Coffee
 *               description:
 *                 type: string
 *                 example: A complimentary cup of coffee for cyclists
 *               tokenCost:
 *                 type: integer
 *                 example: 50
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-31T23:59:59.000Z
 *     responses:
 *       201:
 *         description: Reward created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Reward'
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
 *         description: Not authorised — partner role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", asyncHandler(createReward));

/**
 * @swagger
 * /rewards/partner/{id}:
 *   get:
 *     summary: Get rewards for a partner
 *     description: Retrieve all rewards created by the specified partner. Requires partner role.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Partner user ID
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
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not authorised — partner role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/partner/:id", asyncHandler(getPartnerRewards));

/**
 * @swagger
 * /rewards/{id}:
 *   patch:
 *     summary: Update a reward
 *     description: Update an existing reward's details. Only the owning partner can update their rewards.
 *     tags: [Rewards]
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
 *               title:
 *                 type: string
 *                 example: Free Smoothie
 *               description:
 *                 type: string
 *                 example: A refreshing smoothie for cyclists
 *               tokenCost:
 *                 type: integer
 *                 example: 75
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-12-31T23:59:59.000Z
 *     responses:
 *       200:
 *         description: Reward updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Reward'
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
 *         description: Not authorised — partner role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reward not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id", asyncHandler(updateReward));

/**
 * @swagger
 * /rewards/{id}:
 *   delete:
 *     summary: Delete (archive) a reward
 *     description: Soft-delete a reward by archiving it. Only the owning partner can delete their rewards.
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pathId'
 *     responses:
 *       200:
 *         description: Reward deleted (archived) successfully
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
 *         description: Not authorised — partner role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Reward not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", asyncHandler(deleteReward));

export default router;
