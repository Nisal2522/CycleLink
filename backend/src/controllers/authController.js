import asyncHandler from "express-async-handler";
import { success } from "../utils/responseFormatter.js";
import * as authService from "../services/authService.js";
import { ROLES } from "../constants.js";

function validateRegisterInput(name, email, password, role) {
  if (!name || !name.trim()) return "Full name is required";
  if (name.trim().length < 2 || name.trim().length > 50) return "Name must be between 2 and 50 characters";
  if (!email || !email.trim()) return "Email address is required";
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!EMAIL_REGEX.test(email.trim())) return "Please provide a valid email address";
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (role && !ROLES.includes(role)) return "Invalid role. Must be one of: " + ROLES.join(", ");
  return null;
}

function validateLoginInput(email, password) {
  if (!email || !email.trim()) return "Email address is required";
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!EMAIL_REGEX.test(email.trim())) return "Please provide a valid email address";
  if (!password) return "Password is required";
  return null;
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, shopName } = req.body;
  const validationError = validateRegisterInput(name, email, password, role);
  if (validationError) {
    res.status(400);
    throw new Error(validationError);
  }
  const data = await authService.register({ name, email, password, role, shopName });
  success(res, data, "Registered", 201);
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const validationError = validateLoginInput(email, password);
  if (validationError) {
    res.status(400);
    throw new Error(validationError);
  }
  const data = await authService.login(email, password);
  success(res, data, "Logged in");
});

export const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential || typeof credential !== "string") {
    res.status(400);
    throw new Error("Google credential is required");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !clientId.trim()) {
    res.status(500);
    throw new Error("Google Sign-In is not configured (missing GOOGLE_CLIENT_ID)");
  }
  const data = await authService.googleLogin(credential, clientId);
  success(res, data, "Logged in");
});

export const getProfile = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user._id);
  success(res, data);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user._id, req.body);
  success(res, data);
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const { image } = req.body;
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    res.status(400);
    throw new Error("Invalid image: provide a base64 data URI (data:image/...)");
  }
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    res.status(503);
    throw new Error("Image upload is not configured.");
  }
  const data = await authService.uploadAvatar(req.user._id, image, config);
  success(res, data);
});

export const getPublicStats = asyncHandler(async (req, res) => {
  const data = await authService.getPublicStats();
  success(res, data);
});
