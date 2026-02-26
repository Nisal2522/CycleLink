/**
 * routes/partnerRoutes.js
 * --------------------------------------------------
 * Partner shop profile & image upload.
 *
 * GET   /api/partner/profile       → getProfile
 * PATCH /api/partner/profile       → updateProfile
 * POST  /api/partner/upload-image  → uploadShopImage
 * --------------------------------------------------
 */

import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { partnerOnly } from "../middleware/role.js";
import { validate } from "../middleware/validate.js";
import { bankDetailsUpdateSchema } from "../validatons/partnerValidation.js";
import {
  getProfile,
  updateProfile,
  uploadShopImage,
  getBankDetails,
  putBankDetails,
  deleteBankDetails,
  getMyPayouts,
  getEarningsSummary,
  createPayoutRequest,
  getCheckouts,
  getScanStats,
  getRecentRedemptions,
} from "../controllers/partnerController.js";

const router = express.Router();

// 🔒 All partner routes require authentication + partner role
router.use(protect, partnerOnly);

/**
 * @swagger
 * /partner/:
 *   get:
 *     summary: Partner API health check
 *     description: Simple health check endpoint to verify the partner API is mounted and accessible.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partner API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Partner API
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Optional: health check to verify mount (GET /api/partner returns 200)
router.get("/", (req, res) => res.json({ status: "ok", message: "Partner API" }));

/**
 * @swagger
 * /partner/profile:
 *   get:
 *     summary: Get partner profile
 *     description: Returns the authenticated partner's full profile information including shop details.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Partner profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/profile", asyncHandler(getProfile));

/**
 * @swagger
 * /partner/profile:
 *   patch:
 *     summary: Update partner profile
 *     description: Update the authenticated partner's shop profile fields such as shop name, description, and location.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName:
 *                 type: string
 *                 example: Green Cafe
 *               description:
 *                 type: string
 *                 example: Organic coffee and snacks for cyclists
 *               location:
 *                 type: string
 *                 example: 42 Galle Road, Colombo 03
 *               phone:
 *                 type: string
 *                 example: "+94771234567"
 *               openHours:
 *                 type: string
 *                 example: "8:00 AM - 6:00 PM"
 *     responses:
 *       200:
 *         description: Partner profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/profile", asyncHandler(updateProfile));

/**
 * @swagger
 * /partner/bank-details:
 *   get:
 *     summary: Get bank details
 *     description: Returns the authenticated partner's saved bank account details used for payouts.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BankDetails'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/bank-details", asyncHandler(getBankDetails));

/**
 * @swagger
 * /partner/bank-details:
 *   put:
 *     summary: Update bank details
 *     description: Create or replace the authenticated partner's bank account details for receiving payouts.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BankDetails'
 *     responses:
 *       200:
 *         description: Bank details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BankDetails'
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
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/bank-details", validate(bankDetailsUpdateSchema), asyncHandler(putBankDetails));

/**
 * @swagger
 * /partner/bank-details:
 *   delete:
 *     summary: Clear bank details
 *     description: Remove the authenticated partner's bank account details.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank details cleared successfully
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
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/bank-details", asyncHandler(deleteBankDetails));

/**
 * @swagger
 * /partner/upload-image:
 *   post:
 *     summary: Upload shop image
 *     description: Upload a base64-encoded image for the partner's shop.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64-encoded image string
 *                 example: data:image/png;base64,iVBORw0KGgo...
 *     responses:
 *       200:
 *         description: Shop image uploaded successfully
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
 *                         shopImage:
 *                           type: string
 *                           description: URL of the uploaded shop image
 *                           example: https://res.cloudinary.com/xxx/image/upload/shop.jpg
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/upload-image", asyncHandler(uploadShopImage));

/**
 * @swagger
 * /partner/payouts:
 *   get:
 *     summary: Get partner payouts
 *     description: Returns a list of all payouts for the authenticated partner, including pending and completed payouts.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payouts retrieved successfully
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
 *                         $ref: '#/components/schemas/Payout'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/payouts", asyncHandler(getMyPayouts));

/**
 * @swagger
 * /partner/earnings:
 *   get:
 *     summary: Get earnings summary
 *     description: Returns an aggregated earnings summary for the authenticated partner including total tokens redeemed and revenue.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Earnings summary retrieved successfully
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
 *                         totalTokens:
 *                           type: integer
 *                           example: 5000
 *                         totalAmount:
 *                           type: number
 *                           example: 2500.00
 *                         totalRedemptions:
 *                           type: integer
 *                           example: 120
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/earnings", asyncHandler(getEarningsSummary));

/**
 * @swagger
 * /partner/checkouts:
 *   get:
 *     summary: Get checkouts
 *     description: Returns a paginated list of checkout (redemption) records for the authenticated partner.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/queryPage'
 *       - $ref: '#/components/parameters/queryLimit'
 *     responses:
 *       200:
 *         description: Checkouts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Redemption'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/checkouts", asyncHandler(getCheckouts));

/**
 * @swagger
 * /partner/scan-stats:
 *   get:
 *     summary: Get scan statistics
 *     description: Returns QR scan statistics for the authenticated partner, such as total scans and unique cyclists.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scan stats retrieved successfully
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
 *                         totalScans:
 *                           type: integer
 *                           example: 85
 *                         uniqueCyclists:
 *                           type: integer
 *                           example: 42
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/scan-stats", asyncHandler(getScanStats));

/**
 * @swagger
 * /partner/recent-redemptions:
 *   get:
 *     summary: Get recent redemptions
 *     description: Returns the most recent reward redemptions at the authenticated partner's shop.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of recent redemptions to return
 *     responses:
 *       200:
 *         description: Recent redemptions retrieved successfully
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
 *                         $ref: '#/components/schemas/Redemption'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/recent-redemptions", asyncHandler(getRecentRedemptions));

/**
 * @swagger
 * /partner/payout-requests:
 *   post:
 *     summary: Create a payout request
 *     description: Submit a new payout request for the authenticated partner. The partner must have bank details configured and sufficient earnings.
 *     tags: [Partner]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payout amount to request
 *                 example: 500.00
 *     responses:
 *       201:
 *         description: Payout request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PayoutRequest'
 *       400:
 *         description: Validation error or insufficient balance
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
 *         description: Not a partner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/payout-requests", asyncHandler(createPayoutRequest));

export default router;
