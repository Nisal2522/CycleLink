/**
 * src/validatons/hazardValidation.js — Joi schemas for hazard report/update.
 */
import Joi from "joi";
import { HAZARD_TYPES } from "../constants.js";

export const reportHazardSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  type: Joi.string().valid(...HAZARD_TYPES).optional(),
  category: Joi.string().valid(...HAZARD_TYPES).optional(),
  description: Joi.string().trim().max(200).allow("").optional(),
});

export const updateHazardSchema = Joi.object({
  type: Joi.string().valid(...HAZARD_TYPES).optional(),
  description: Joi.string().trim().max(200).allow("").optional(),
}).min(1);

export const verifyHazardSchema = Joi.object({
  status: Joi.string().valid("exists", "resolved", "spam").required(),
});
