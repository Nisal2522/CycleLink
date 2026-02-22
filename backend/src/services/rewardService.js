/**
 * src/services/rewardService.js — Rewards business logic & DB only (Requirement iii).
 */
import Reward from "../models/Reward.js";

export async function createReward(partnerId, { title, description, tokenCost, expiryDate }) {
  return Reward.create({
    partnerId,
    title,
    description,
    tokenCost,
    expiryDate,
  });
}

export async function getPartnerRewards(partnerId, targetPartnerId) {
  if (partnerId.toString() !== targetPartnerId.toString()) {
    const err = new Error("You can only view your own rewards");
    err.statusCode = 403;
    throw err;
  }
  return Reward.find({ partnerId: targetPartnerId, active: true }).sort({ createdAt: -1 }).lean();
}

export async function updateReward(partnerId, rewardId, fields) {
  const reward = await Reward.findById(rewardId);
  if (!reward) {
    const err = new Error("Reward not found");
    err.statusCode = 404;
    throw err;
  }
  if (reward.partnerId.toString() !== partnerId.toString()) {
    const err = new Error("You can only update your own rewards");
    err.statusCode = 403;
    throw err;
  }
  const updatable = ["title", "description", "tokenCost", "expiryDate", "active"];
  updatable.forEach((field) => {
    if (fields[field] !== undefined) reward[field] = fields[field];
  });
  await reward.save();
  return reward;
}

export async function deleteReward(partnerId, rewardId) {
  const reward = await Reward.findById(rewardId);
  if (!reward) {
    const err = new Error("Reward not found");
    err.statusCode = 404;
    throw err;
  }
  if (reward.partnerId.toString() !== partnerId.toString()) {
    const err = new Error("You can only delete your own rewards");
    err.statusCode = 403;
    throw err;
  }
  reward.active = false;
  await reward.save();
  return { message: "Reward archived", _id: rewardId };
}
