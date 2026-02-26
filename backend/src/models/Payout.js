/**
 * models/Payout.js
 * --------------------------------------------------
 * Monthly payout record per partner for admin processing.
 *
 * TOKEN_VALUE = 10 LKR per token.
 *
 * Fields:
 *   - partnerId      : ObjectId → User (partner)
 *   - month         : String "YYYY-MM"
 *   - totalTokens   : number of tokens redeemed in that month
 *   - totalAmount   : LKR (totalTokens * TOKEN_VALUE)
 *   - status          : 'Pending' | 'Paid'
 *   - transactionId   : when paid
 *   - adjustmentAmount: manual adjustment (LKR) before processing
 *   - adjustmentNote  : admin note for the adjustment
 * --------------------------------------------------
 */

import mongoose from "mongoose";

export const TOKEN_VALUE = 10; // LKR per token

const payoutSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    totalTokens: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: { values: ["Pending", "Paid"], message: "Status must be Pending or Paid" },
      default: "Pending",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    adjustmentAmount: {
      type: Number,
      default: 0,
    },
    adjustmentNote: {
      type: String,
      trim: true,
      maxlength: [300, "Adjustment note must be under 300 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

payoutSchema.index({ partnerId: 1, month: 1 }, { unique: true });

const Payout = mongoose.model("Payout", payoutSchema);
export default Payout;
