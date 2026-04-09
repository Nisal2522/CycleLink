import Joi from "joi";
import { ROLES } from "../constants.js";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid(...ROLES),
  shopName: Joi.string().trim().max(80),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().required(),
});

export const googleLoginSchema = Joi.object({
  credential: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  profileImage: Joi.string().trim().allow(""),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({ "any.only": "Passwords do not match" }),
});

export const deleteAccountSchema = Joi.object({
  password: Joi.string().required(),
});
