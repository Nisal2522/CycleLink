/**
 * src/validatons/rideValidation.js — Ride lifecycle validation schemas.
 */
import Joi from "joi";

export const startRideSchema = Joi.object({
  routeId: Joi.string().optional().allow(null, ""),
  startLocation: Joi.string().trim().max(200).optional(),
});

export const endRideSchema = Joi.object({
  distance: Joi.number().min(0).max(500).required(),
  endLocation: Joi.string().trim().max(200).optional(),
  duration: Joi.string().trim().max(30).optional(),
});
