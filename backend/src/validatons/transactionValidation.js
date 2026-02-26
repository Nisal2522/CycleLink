/**
 * src/validations/transactionValidation.js — Joi schemas for transactions/redeem (Requirement v).
 */
import Joi from "joi";

export const redeemTokensSchema = Joi.object({
  cyclistId: Joi.string().required(),
  tokens: Joi.number().integer().min(1).required(),
});

export const confirmRedeemSchema = Joi.object({
  transactionId: Joi.string().required(),
  mealName: Joi.string().trim().optional().allow("", null),
  tokenAmount: Joi.number().positive().required(),
  cyclistId: Joi.string().required(),
  cyclistName: Joi.string().trim().optional(),
  expiryTime: Joi.date().optional().allow(null),
});
