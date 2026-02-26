/**
 * src/models/Hazard.js — Cycling hazard reports (Data Layer).
 */
import mongoose from "mongoose";
import { HAZARD_TYPES } from "../constants.js";

export { HAZARD_TYPES };

const hazardSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    type: {
      type: String,
      enum: { values: HAZARD_TYPES, message: "Invalid hazard type" },
      default: "other",
    },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    active: { type: Boolean, default: true },

    // Community validation status
    status: {
      type: String,
      enum: ["reported", "verified", "resolved", "invalid"],
      default: "reported",
    },

    // Community verifications
    verifications: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ["exists", "resolved", "spam"] },
      timestamp: { type: Date, default: Date.now },
    }],

    // Verification counts for quick access
    existsCount: { type: Number, default: 0 },
    resolvedCount: { type: Number, default: 0 },
    spamCount: { type: Number, default: 0 },

    // Auto-resolved tracking
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Expiry (for old hazards)
    expiresAt: { type: Date },

    // Admin moderation
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    moderationNote: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

hazardSchema.index({ lat: 1, lng: 1 });
hazardSchema.index({ expiresAt: 1 });
hazardSchema.index({ status: 1, createdAt: -1 });

const Hazard = mongoose.model("Hazard", hazardSchema);
export default Hazard;
