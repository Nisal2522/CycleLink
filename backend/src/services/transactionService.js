/**
 * src/services/transactionService.js — Transactions/Scanner business logic & DB only (Requirement iii).
 */
import User from "../models/User.js";
import Redemption from "../models/Redemption.js";
import { TOKEN_VALUE } from "../models/Payout.js";
import { notifyRewardClaimed } from "./notificationService.js";

export async function redeemTokens(partnerId, cyclistId, tokens) {
  const cyclist = await User.findById(cyclistId);
  if (!cyclist || cyclist.role !== "cyclist") {
    const err = new Error("Cyclist not found");
    err.statusCode = 404;
    throw err;
  }
  if (cyclist.tokens < tokens) {
    const err = new Error("Cyclist does not have enough tokens");
    err.statusCode = 400;
    throw err;
  }
  cyclist.tokens -= tokens;
  await cyclist.save();

  const partner = await User.findById(partnerId);
  if (partner) {
    partner.partnerTotalRedemptions = (partner.partnerTotalRedemptions || 0) + 1;
    partner.partnerAvailableBalance = (partner.partnerAvailableBalance || 0) + tokens * TOKEN_VALUE;
    await partner.save();
  }

  await Redemption.create({
    partnerId,
    cyclistId: cyclist._id,
    tokens,
  });

  await notifyRewardClaimed({
    cyclistId: cyclist._id,
    cyclistName: cyclist.name,
    partnerId,
    partnerName: partner?.shopName || partner?.name,
    tokens,
    type: "manual",
  }).catch(() => {});

  return {
    message: "Tokens redeemed successfully",
    redeemedTokens: tokens,
    cyclist: { _id: cyclist._id, name: cyclist.name, tokens: cyclist.tokens },
    partner: {
      _id: partner?._id,
      shopName: partner?.shopName,
      partnerTotalRedemptions: partner?.partnerTotalRedemptions,
    },
  };
}

export async function confirmRedeem(partnerId, body) {
  const { transactionId, mealName, tokenAmount, cyclistId, cyclistName, expiryTime } = body;
  const tokens = Number(tokenAmount);
  if (!Number.isFinite(tokens) || tokens <= 0) {
    const err = new Error("tokenAmount must be a positive number");
    err.statusCode = 400;
    throw err;
  }

  const existing = await Redemption.findOne({ transactionId });
  if (existing) {
    const err = new Error("This QR code has already been used");
    err.statusCode = 400;
    throw err;
  }

  if (expiryTime) {
    const expiry = new Date(expiryTime);
    if (Number.isNaN(expiry.getTime()) || expiry < new Date()) {
      const err = new Error("This QR code has expired");
      err.statusCode = 400;
      throw err;
    }
  }

  const cyclist = await User.findById(cyclistId);
  if (!cyclist || cyclist.role !== "cyclist") {
    const err = new Error("Cyclist not found");
    err.statusCode = 404;
    throw err;
  }
  if (cyclist.tokens < tokens) {
    const err = new Error("Cyclist does not have enough tokens");
    err.statusCode = 400;
    throw err;
  }

  cyclist.tokens -= tokens;
  await cyclist.save();

  const partner = await User.findById(partnerId);
  if (partner) {
    partner.partnerTotalRedemptions = (partner.partnerTotalRedemptions || 0) + 1;
    partner.partnerAvailableBalance = (partner.partnerAvailableBalance || 0) + tokens * TOKEN_VALUE;
    await partner.save();
  }

  await Redemption.create({
    partnerId,
    cyclistId: cyclist._id,
    tokens,
    transactionId,
    itemName: mealName || null,
  });

  await notifyRewardClaimed({
    cyclistId: cyclist._id,
    cyclistName: cyclist.name,
    partnerId,
    partnerName: partner?.shopName || partner?.name,
    tokens,
    transactionId,
    itemName: mealName,
    type: "qr",
  }).catch(() => {});

  return {
    message: "Checkout completed",
    status: "Completed",
    transactionId,
    redeemedTokens: tokens,
    cyclist: { _id: cyclist._id, name: cyclist.name, tokens: cyclist.tokens },
  };
}
