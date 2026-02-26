/**
 * src/validatons/payoutValidation.js — Joi schemas for admin payout operations (Requirement v).
 */
import Joi from "joi";

/** Body for rejecting a payout request: rejectionReason required */
export const rejectPayoutRequestSchema = Joi.object({
  rejectionReason: Joi.string().trim().min(1).max(500).required().messages({
    "string.empty": "Rejection reason is required",
    "string.min": "Rejection reason must be at least 1 character",
  }),
});

/** Body for PATCH /api/admin/payouts/:id — adjustment before processing */
export const updatePayoutAdjustmentSchema = Joi.object({
  adjustmentAmount: Joi.number().min(-999999).max(999999).required().messages({
    "number.base": "Adjustment amount must be a number",
  }),
  adjustmentNote: Joi.string().trim().max(300).allow("").optional(),
});
