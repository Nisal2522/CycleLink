/**
 * src/validations/partnerValidation.js — Joi schemas for partner (Requirement v).
 */
import Joi from "joi";

export const updatePartnerProfileSchema = Joi.object({
  shopName: Joi.string().trim().max(80).optional(),
  description: Joi.string().trim().max(500).optional(),
  location: Joi.string().trim().max(100).optional(),
  address: Joi.string().trim().max(200).optional(),
  category: Joi.string().trim().max(60).optional(),
  phoneNumber: Joi.string().trim().max(20).optional(),
  shopImageUrl: Joi.string().trim().allow("").optional(),
});

export const uploadImageSchema = Joi.object({
  image: Joi.string().pattern(/^data:image\//).required(),
});

export const createPayoutRequestSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

export const checkoutsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
});

export const recentRedemptionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(10).optional().default(5),
});

/** Bank details for payout destination — all fields required (create/full replace). */
export const bankDetailsSchema = Joi.object({
  bankName: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Bank name is required",
  }),
  branchName: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Branch name is required",
  }),
  accountNo: Joi.string().trim().min(1).max(40).required().messages({
    "string.empty": "Account number is required",
  }),
  accountHolderName: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Account holder name is required",
  }),
});

/** Partial update — all fields optional; when present validated (Requirement v). */
export const bankDetailsUpdateSchema = Joi.object({
  bankName: Joi.string().trim().min(1).max(100).allow("").optional(),
  branchName: Joi.string().trim().min(1).max(100).allow("").optional(),
  accountNo: Joi.string().trim().min(1).max(40).allow("").optional(),
  accountHolderName: Joi.string().trim().min(1).max(100).allow("").optional(),
}).min(1);
