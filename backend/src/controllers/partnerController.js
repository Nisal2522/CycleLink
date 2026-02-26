/**
 * src/controllers/partnerController.js — Extract request data, call services, return HTTP via responseFormatter only.
 */
import asyncHandler from "express-async-handler";
import { success } from "../utils/responseFormatter.js";
import * as partnerService from "../services/partnerService.js";

export const getProfile = asyncHandler(async (req, res) => {
  const data = await partnerService.getProfile(req.user._id);
  success(res, data);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await partnerService.updateProfile(req.user._id, req.body);
  success(res, data);
});

export const uploadShopImage = asyncHandler(async (req, res) => {
  const { image } = req.body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    res.status(400);
    throw new Error("Invalid image: provide a base64 data URI (data:image/...)");
  }
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    res.status(503);
    throw new Error("Image upload is not configured.");
  }
  const data = await partnerService.uploadShopImage(req.user._id, image, config);
  success(res, data);
});

export const getMyPayouts = asyncHandler(async (req, res) => {
  const data = await partnerService.getMyPayouts(req.user._id);
  success(res, data);
});

export const getEarningsSummary = asyncHandler(async (req, res) => {
  const data = await partnerService.getEarningsSummary(req.user._id);
  success(res, data);
});

export const createPayoutRequest = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A positive amount is required");
  }
  const data = await partnerService.createPayoutRequest(req.user._id, amount);
  success(res, data, "Payout request created", 201);
});

export const getCheckouts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
  const result = await partnerService.getCheckouts(req.user._id, page, limit);
  res.status(200).json({
    success: true,
    data: result.checkouts,
    pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
  });
});

export const getScanStats = asyncHandler(async (req, res) => {
  const data = await partnerService.getScanStats(req.user._id);
  success(res, data);
});

export const getRecentRedemptions = asyncHandler(async (req, res) => {
  const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const data = await partnerService.getRecentRedemptions(req.user._id, limit);
  success(res, data);
});

export const getBankDetails = asyncHandler(async (req, res) => {
  const data = await partnerService.getBankDetails(req.user._id);
  success(res, data, "Bank details retrieved");
});

export const putBankDetails = asyncHandler(async (req, res) => {
  const data = await partnerService.updateBankDetails(req.user._id, req.body);
  success(res, data, "Bank details saved");
});

export const deleteBankDetails = asyncHandler(async (req, res) => {
  const data = await partnerService.clearBankDetails(req.user._id);
  success(res, data, "Bank details removed");
});
