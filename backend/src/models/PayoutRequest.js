import mongoose from "mongoose";

const payoutRequestSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: { values: ["Pending", "Paid", "Rejected"], message: "Status must be Pending, Paid or Rejected" },
      default: "Pending",
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Rejection reason must be under 500 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

payoutRequestSchema.index({ partnerId: 1, createdAt: -1 });

const PayoutRequest = mongoose.model("PayoutRequest", payoutRequestSchema);
export default PayoutRequest;

