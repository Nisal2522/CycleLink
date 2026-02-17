/**
 * src/controllers/rewardController.js — Rewards: request data, services, responseFormatter only.
 */
import asyncHandler from "express-async-handler";
import { success } from "../utils/responseFormatter.js";
import * as rewardService from "../services/rewardService.js";

export const createReward = asyncHandler(async (req, res) => {
  const { title, description, tokenCost, expiryDate } = req.body;
  const data = await rewardService.createReward(req.user._id, { title, description, tokenCost, expiryDate });
  success(res, data, "Reward created", 201);
});

export const getPartnerRewards = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await rewardService.getPartnerRewards(req.user._id, id);
  success(res, data);
});

export const updateReward = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await rewardService.updateReward(req.user._id, id, req.body);
  success(res, data);
});

export const deleteReward = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await rewardService.deleteReward(req.user._id, id);
  success(res, data, data.message);
});
