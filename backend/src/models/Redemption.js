/**
 * src/models/Redemption.js — Token redemption log at partner (Data Layer).
 */
import mongoose from "mongoose";

const redemptionSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cyclistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokens: { type: Number, required: true, min: 1 },
    transactionId: { type: String, sparse: true, unique: true, default: null },
    itemName: { type: String, default: null },
  },
  { timestamps: true }
);

redemptionSchema.index({ partnerId: 1, createdAt: -1 });
redemptionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

const Redemption = mongoose.model("Redemption", redemptionSchema);
export default Redemption;
