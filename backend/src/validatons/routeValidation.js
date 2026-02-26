/**
 * src/validatons/routeValidation.js — Joi schemas for route create/update.
 */
import Joi from "joi";

const pathPointSchema = Joi.object({
  lat: Joi.number().required(),
  lng: Joi.number().required(),
});

export const createRouteSchema = Joi.object({
  startLocation: Joi.string().trim().min(1).required(),
  endLocation: Joi.string().trim().min(1).required(),
  path: Joi.array().items(pathPointSchema).min(2).required(),
  distance: Joi.string().trim().min(1).required(),
  duration: Joi.string().trim().allow("").optional(),
  weatherCondition: Joi.string().trim().allow("").optional(),
});

export const updateRouteSchema = Joi.object({
  startLocation: Joi.string().trim().min(1).optional(),
  endLocation: Joi.string().trim().min(1).optional(),
  path: Joi.array().items(pathPointSchema).min(2).optional(),
  distance: Joi.string().trim().min(1).optional(),
  duration: Joi.string().trim().allow("").optional(),
  weatherCondition: Joi.string().trim().allow("").optional(),
}).min(1);

export const rateRouteSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).optional().allow(""),
});
