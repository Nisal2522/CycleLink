/**
 * src/services/authService.js — Auth business logic & DB only (Requirement iii).
 */
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import Ride from "../models/Ride.js";
import Route from "../models/Route.js";
import Payment from "../models/Payment.js";
import Hazard from "../models/Hazard.js";
import Redemption from "../models/Redemption.js";
import generateToken from "../utils/generateToken.js";

export async function register({ name, email, password, role, shopName }) {
  const sanitizedEmail = email.trim().toLowerCase();
  const userExists = await User.findOne({ email: sanitizedEmail });
  if (userExists) {
    const err = new Error("An account with this email already exists");
    err.statusCode = 409;
    throw err;
  }
  const user = await User.create({
    name: name.trim(),
    email: sanitizedEmail,
    password,
    role: role || "cyclist",
    ...(role === "partner" && shopName ? { shopName: shopName.trim() } : {}),
  });
  if (!user) {
    const err = new Error("Failed to create account. Please try again.");
    err.statusCode = 500;
    throw err;
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName || "",
    shopImage: user.shopImage || "",
    profileImage: user.profileImage || "",
    partnerTotalRedemptions: user.partnerTotalRedemptions,
    token: generateToken(user._id),
  };
}

export async function login(email, password) {
  const sanitizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: sanitizedEmail });
  if (!user || !(await user.matchPassword(password))) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }
  if (user.isBlocked) {
    const err = new Error("Account is blocked. Contact support.");
    err.statusCode = 403;
    throw err;
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName,
    shopImage: user.shopImage || "",
    profileImage: user.profileImage || "",
    partnerTotalRedemptions: user.partnerTotalRedemptions,
    token: generateToken(user._id),
  };
}

export async function googleLogin(credential, clientId) {
  const client = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    const err = new Error("Invalid or expired Google token. Please try again.");
    err.statusCode = 401;
    throw err;
  }
  const email = payload.email && payload.email.trim().toLowerCase();
  const name = (payload.name || payload.given_name || email || "User")
    .trim()
    .slice(0, 50);
  if (!email) {
    const err = new Error("Google account did not provide an email");
    err.statusCode = 400;
    throw err;
  }
  let user = await User.findOne({ email });
  if (user) {
    if (user.isBlocked) {
      const err = new Error("Account is blocked. Contact support.");
      err.statusCode = 403;
      throw err;
    }
  } else {
    user = await User.create({
      name: name || "User",
      email,
      password: crypto.randomBytes(32).toString("hex"),
      role: "cyclist",
    });
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName || null,
    shopImage: user.shopImage || "",
    profileImage: user.profileImage || "",
    partnerTotalRedemptions: user.partnerTotalRedemptions ?? 0,
    token: generateToken(user._id),
  };
}

export async function getProfile(userId) {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName,
    shopImage: user.shopImage || "",
    profileImage: user.profileImage || "",
    partnerTotalRedemptions: user.partnerTotalRedemptions,
    createdAt: user.createdAt,
  };
}

export async function updateProfile(userId, { name, profileImage }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (name !== undefined) user.name = String(name).trim().slice(0, 50);
  if (profileImage !== undefined)
    user.profileImage = String(profileImage).trim();
  await user.save();
  return {
    _id: user._id,
    name: user.name,
    profileImage: user.profileImage || "",
  };
}

export async function uploadAvatar(userId, imageBase64, cloudinaryConfig) {
  cloudinary.config(cloudinaryConfig);
  const result = await cloudinary.uploader.upload(imageBase64, {
    folder: "cyclelink/avatars",
    resource_type: "image",
  });
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  user.profileImage = result.secure_url;
  await user.save();
  return { url: result.secure_url, profileImage: result.secure_url };
}

export async function getPublicStats() {
  return { totalUsers: await User.countDocuments() };
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 401;
    throw err;
  }
  user.password = newPassword;
  await user.save();
  return { message: "Password changed successfully" };
}

export async function deleteOwnAccount(userId, password) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (user.role === "admin") {
    const err = new Error("Admin accounts cannot be self-deleted");
    err.statusCode = 403;
    throw err;
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const err = new Error("Incorrect password");
    err.statusCode = 401;
    throw err;
  }
  await Promise.all([
    Ride.deleteMany({ cyclistId: userId }),
    Route.deleteMany({ creatorId: userId }),
    Payment.deleteMany({ userId }),
    Hazard.deleteMany({ reportedBy: userId }),
    Redemption.deleteMany({ cyclistId: userId }),
  ]);
  await User.findByIdAndDelete(userId);
  return { message: "Account deleted successfully" };
}

/**
 * Get user by ID for auth middleware (Clean Architecture: user lookup in service).
 * Returns Mongoose document without password, or null if not found.
 */
export async function getUserById(userId) {
  if (!userId) return null;
  const user = await User.findById(userId).select("-password").lean();
  return user;
}
