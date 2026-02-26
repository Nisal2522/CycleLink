/**
 * src/services/hazardService.js
 * --------------------------------------------------
 * Hazard business logic. All Hazard model access here (Controller → Service → Model).
 */

import Hazard from "../models/Hazard.js";
import { HAZARD_TYPES } from "../constants.js";
import { LIMITS } from "../constants.js";

export async function getHazards() {
  return Hazard.find({ active: true })
    .select("lat lng type description reportedBy createdAt")
    .populate("reportedBy", "name")
    .sort({ createdAt: -1 })
    .limit(LIMITS.HAZARDS_LIST);
}

export async function getHazardMarkers() {
  return Hazard.find({ active: true })
    .select("lat lng type description reportedBy status verifications existsCount resolvedCount spamCount")
    .populate("reportedBy", "name")
    .sort({ createdAt: -1 })
    .lean()
    .limit(LIMITS.HAZARDS_LIST);
}

export async function reportHazard(userId, body) {
  const { lat, lng } = body;
  const type = (body.type ?? body.category ?? "other").toString().trim() || "other";
  const description = (body.description != null ? String(body.description) : "").trim();
  const safeType = HAZARD_TYPES.includes(type) ? type : "other";
  const hazard = await Hazard.create({
    lat: Number(lat),
    lng: Number(lng),
    type: safeType,
    description,
    reportedBy: userId,
  });
  await hazard.populate("reportedBy", "name");
  return hazard;
}

export async function updateHazard(hazardId, userId, body) {
  const hazard = await Hazard.findById(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  if (hazard.reportedBy.toString() !== userId.toString()) {
    const err = new Error("You can only edit hazards you reported");
    err.statusCode = 403;
    throw err;
  }
  const { type, description } = body;
  if (type) hazard.type = type;
  if (description !== undefined) hazard.description = description;
  await hazard.save();
  await hazard.populate("reportedBy", "name");
  return hazard;
}

export async function deleteHazard(hazardId, userId) {
  const hazard = await Hazard.findById(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  if (hazard.reportedBy.toString() !== userId.toString()) {
    const err = new Error("You can only delete hazards you reported");
    err.statusCode = 403;
    throw err;
  }
  await hazard.deleteOne();
  return { message: "Hazard deleted successfully", _id: hazardId };
}

export async function verifyHazard(hazardId, userId, verificationStatus) {
  const hazard = await Hazard.findById(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }

  // Prevent users from verifying their own hazards
  if (hazard.reportedBy.toString() === userId.toString()) {
    const err = new Error("You cannot verify your own hazard");
    err.statusCode = 403;
    throw err;
  }

  // Check if user already verified this hazard
  const existingVerification = hazard.verifications.find(
    v => v.userId.toString() === userId.toString()
  );

  if (existingVerification) {
    // Update existing verification
    existingVerification.status = verificationStatus;
    existingVerification.timestamp = new Date();
  } else {
    // Add new verification
    hazard.verifications.push({
      userId,
      status: verificationStatus,
      timestamp: new Date(),
    });
  }

  // Update counts
  hazard.existsCount = hazard.verifications.filter(v => v.status === "exists").length;
  hazard.resolvedCount = hazard.verifications.filter(v => v.status === "resolved").length;
  hazard.spamCount = hazard.verifications.filter(v => v.status === "spam").length;

  // Auto-update status based on threshold
  if (hazard.resolvedCount >= 3 && hazard.status !== "resolved") {
    hazard.status = "resolved";
    hazard.resolvedAt = new Date();
    hazard.resolvedBy = userId;
  } else if (hazard.spamCount >= 3 && hazard.status !== "invalid") {
    hazard.status = "invalid";
    hazard.active = false;  // Hide from map
  } else if (hazard.existsCount >= 2 && hazard.status === "reported") {
    hazard.status = "verified";
  }

  await hazard.save();
  await hazard.populate("reportedBy", "name");
  return hazard;
}

export async function getHazardVerifications(hazardId) {
  const hazard = await Hazard.findById(hazardId)
    .populate("verifications.userId", "name")
    .select("verifications existsCount resolvedCount spamCount status");
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  return hazard;
}

export async function moderateHazard(hazardId, adminId, body) {
  const hazard = await Hazard.findById(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }

  const { status, active, moderationNote } = body;

  if (status) hazard.status = status;
  if (active !== undefined) hazard.active = active;
  if (moderationNote) hazard.moderationNote = moderationNote;

  hazard.moderatedBy = adminId;

  await hazard.save();
  await hazard.populate("reportedBy", "name");
  return hazard;
}

export async function forceDeleteHazard(hazardId, adminId) {
  const hazard = await Hazard.findById(hazardId);
  if (!hazard) {
    const err = new Error("Hazard not found");
    err.statusCode = 404;
    throw err;
  }
  await hazard.deleteOne();
  return { message: "Hazard deleted by admin", _id: hazardId };
}

/**
 * Mark hazards as stale if no activity for 30 days
 * and auto-resolve if resolved count >= 3
 */
export async function cleanupStaleHazards() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Find hazards with no verifications in 30 days
  const staleHazards = await Hazard.find({
    active: true,
    status: { $in: ["reported", "verified"] },
    createdAt: { $lt: thirtyDaysAgo },
    "verifications.0": { $exists: false }, // No verifications
  });

  // Mark as expired but don't delete
  for (const hazard of staleHazards) {
    hazard.expiresAt = new Date();
    hazard.active = false;  // Hide from map
    await hazard.save();
  }

  return {
    message: `Marked ${staleHazards.length} stale hazard(s) as expired`,
    count: staleHazards.length
  };
}
