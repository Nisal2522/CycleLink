/**
 * models/Payment.js
 * --------------------------------------------------
 * Payment records for tracking completed transactions.
 * Currently used for displaying payment history in admin dashboard.
 * Can be extended for PayHere or other payment gateway integrations.
 *
 * Fields:
 *   - userId       : ObjectId → User
 *   - transactionId: Payment gateway transaction/order ID
 *   - amount       : number (LKR)
 *   - currency     : string (e.g. 'lkr')
 *   - status       : 'Success' | 'Pending'
 *   - productName  : string (e.g. 'Cycling Tour Package')
 * --------------------------------------------------
 */

import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "lkr",
      trim: true,
    },
    status: {
      type: String,
      enum: { values: ["Success", "Pending"], message: "Status must be Success or Pending" },
      default: "Success",
    },
    productName: {
      type: String,
      default: "Cycling Tour Package",
      trim: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
