import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startLocation: { type: String, required: true, trim: true, maxlength: 200 },
    endLocation: { type: String, required: true, trim: true, maxlength: 200 },
    path: {
      type: [{ lat: { type: Number, required: true }, lng: { type: Number, required: true } }],
      default: [],
      validate: { validator: (v) => Array.isArray(v) && v.length >= 2, message: "Path must have at least 2 points" },
    },
    distance: { type: String, required: true, trim: true, maxlength: 20 },
    duration: { type: String, trim: true, default: "", maxlength: 30 },
    weatherCondition: { type: String, trim: true, default: "", maxlength: 120 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

    // Ratings & Feedback
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, trim: true, maxlength: 500, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Cached aggregates for performance
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

routeSchema.index({ status: 1 });
routeSchema.index({ creatorId: 1, createdAt: -1 });
routeSchema.index({ averageRating: -1 });

const Route = mongoose.model("Route", routeSchema);
export default Route;