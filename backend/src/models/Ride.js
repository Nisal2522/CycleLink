/**
 * src/models/Ride.js — Single completed ride by cyclist (Data Layer).
 */
import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    cyclistId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Link to saved route (optional)
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", default: null },

    startLocation: { type: String, trim: true, default: "—", maxlength: 200 },
    endLocation: { type: String, trim: true, default: "—", maxlength: 200 },
    distance: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, min: 0, default: null },
    durationText: { type: String, trim: true, default: "", maxlength: 30 },
    tokensEarned: { type: Number, required: true, min: 0 },
    co2Saved: { type: Number, required: true, min: 0 },

    // Ride lifecycle tracking
    status: {
      type: String,
      enum: ["active", "paused", "completed", "cancelled"],
      default: "completed" // Default for backward compatibility with existing rides
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

rideSchema.index({ cyclistId: 1, createdAt: -1 });
// Index for finding active rides efficiently
rideSchema.index({ cyclistId: 1, status: 1 });

const Ride = mongoose.model("Ride", rideSchema);
export default Ride;
