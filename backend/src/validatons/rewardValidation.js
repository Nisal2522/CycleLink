/**
 * src/validations/rewardValidation.js — Joi schemas for rewards (Requirement v).
 */
import Joi from "joi";

export const createRewardSchema = Joi.object({
  title: Joi.string().trim().max(80).required(),
  description: Joi.string().trim().max(240).optional().allow("", null),
  tokenCost: Joi.number().integer().min(1).required(),
  expiryDate: Joi.date().optional().allow(null),
});

export const updateRewardSchema = Joi.object({
  title: Joi.string().trim().max(80).optional(),
  description: Joi.string().trim().max(240).optional().allow("", null),
  tokenCost: Joi.number().integer().min(1).optional(),
  expiryDate: Joi.date().optional().allow(null),
  active: Joi.boolean().optional(),
});
