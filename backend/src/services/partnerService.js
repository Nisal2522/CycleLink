/**
 * src/services/partnerService.js — Partner/Shop business logic (Requirement iii).
 * DB access via Mongoose models directly (Controller → Service → Model pattern).
 */
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import Payout from "../models/Payout.js";
import PayoutRequest from "../models/PayoutRequest.js";
import Redemption from "../models/Redemption.js";
import { TOKEN_VALUE } from "../models/Payout.js";

const PARTNER_SELECT =
  "name email role shopName shopImage description location address category phoneNumber partnerTotalRedemptions partnerAvailableBalance bankDetails";

export async function getProfile(partnerId) {
  const user = await User.findById(partnerId).select(PARTNER_SELECT).exec();
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const bd = user.bankDetails || {};
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName || "",
    shopImageUrl: user.shopImage || "",
    description: user.description || "",
    location: user.location || "",
    address: user.address || "",
    category: user.category || "",
    phoneNumber: user.phoneNumber || "",
    partnerTotalRedemptions: user.partnerTotalRedemptions || 0,
    partnerAvailableBalance: user.partnerAvailableBalance || 0,
    bankDetails: {
      bankName: bd.bankName || "",
      branchName: bd.branchName || "",
      accountNo: bd.accountNo || "",
      accountHolderName: bd.accountHolderName || "",
    },
  };
}

/**
 * Get partner bank details only (for GET /api/partner/bank-details).
 */
export async function getBankDetails(partnerId) {
  const user = await User.findById(partnerId).select("bankDetails").lean().exec();
  const bd = user?.bankDetails || null;
  return {
    bankDetails: {
      bankName: bd?.bankName ?? "",
      branchName: bd?.branchName ?? "",
      accountNo: bd?.accountNo ?? "",
      accountHolderName: bd?.accountHolderName ?? "",
    },
  };
}

/**
 * Save or update partner bank details (full or partial).
 */
export async function updateBankDetails(partnerId, payload) {
  const user = await User.findById(partnerId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (!user.bankDetails) user.bankDetails = {};
  if (payload.bankName !== undefined) user.bankDetails.bankName = String(payload.bankName).trim();
  if (payload.branchName !== undefined) user.bankDetails.branchName = String(payload.branchName).trim();
  if (payload.accountNo !== undefined) user.bankDetails.accountNo = String(payload.accountNo).trim();
  if (payload.accountHolderName !== undefined) user.bankDetails.accountHolderName = String(payload.accountHolderName).trim();
  await user.save();
  const bd = user.bankDetails || {};
  return {
    bankDetails: {
      bankName: bd.bankName || "",
      branchName: bd.branchName || "",
      accountNo: bd.accountNo || "",
      accountHolderName: bd.accountHolderName || "",
    },
  };
}

/**
 * Clear partner bank details (DELETE /api/partner/bank-details).
 */
export async function clearBankDetails(partnerId) {
  const user = await User.findById(partnerId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  user.bankDetails = {
    bankName: "",
    branchName: "",
    accountNo: "",
    accountHolderName: "",
  };
  await user.save();
  return {
    bankDetails: {
      bankName: "",
      branchName: "",
      accountNo: "",
      accountHolderName: "",
    },
  };
}

export async function updateProfile(partnerId, fields) {
  const user = await User.findById(partnerId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const { shopName, description, location, address, category, phoneNumber, shopImageUrl } = fields;
  if (shopName !== undefined) user.shopName = String(shopName).trim();
  if (description !== undefined) user.description = String(description).trim();
  if (location !== undefined) user.location = String(location).trim();
  if (address !== undefined) user.address = String(address).trim();
  if (category !== undefined) user.category = String(category).trim();
  if (phoneNumber !== undefined) user.phoneNumber = String(phoneNumber).trim();
  if (shopImageUrl !== undefined) user.shopImage = String(shopImageUrl).trim();
  await user.save();
  return {
    shopName: user.shopName || "",
    shopImageUrl: user.shopImage || "",
    description: user.description || "",
    location: user.location || "",
    address: user.address || "",
    category: user.category || "",
    phoneNumber: user.phoneNumber || "",
  };
}

export async function uploadShopImage(partnerId, imageBase64, cloudinaryConfig) {
  cloudinary.config(cloudinaryConfig);
  const result = await cloudinary.uploader.upload(imageBase64, {
    folder: "cyclelink/shops",
    resource_type: "image",
  });
  return { url: result.secure_url };
}

export async function getMyPayouts(partnerId) {
  return Payout.find({ partnerId }).sort({ month: -1 }).lean();
}

/**
 * Recompute partner's available balance: earned (redemptions) minus Payout Requests paid minus Monthly Payouts processed.
 * Single source of truth so LKR amounts stay consistent between Payout Requests and Payout Management.
 */
export async function syncPartnerAvailableBalance(partnerId) {
  const [redemptions, paidRequests, paidPayouts] = await Promise.all([
    Redemption.find({ partnerId }).select("tokens").lean(),
    PayoutRequest.find({ partnerId, status: "Paid" }).select("amount").lean(),
    Payout.find({ partnerId, status: "Paid" }).select("totalAmount adjustmentAmount").lean(),
  ]);
  const totalEarned = redemptions.reduce((sum, r) => sum + (r.tokens || 0) * TOKEN_VALUE, 0);
  const totalWithdrawnRequests = paidRequests.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalWithdrawnPayouts = paidPayouts.reduce(
    (sum, p) => sum + (p.totalAmount || 0) + (p.adjustmentAmount ?? 0),
    0
  );
  const balance = Math.max(0, totalEarned - totalWithdrawnRequests - totalWithdrawnPayouts);
  await User.findByIdAndUpdate(partnerId, { partnerAvailableBalance: balance });
  return balance;
}

/**
 * Build a Payment History row from a PayoutRequest (same shape as Payout for the table).
 * Shows actual status (Pending/Paid/Rejected) instead of hardcoded "Paid".
 */
function payoutRequestToHistoryRow(pr) {
  const date = pr.updatedAt || pr.createdAt;
  const month = date ? new Date(date).toISOString().slice(0, 7) : null;
  return {
    _id: pr._id,
    month: month || "",
    totalTokens: 0,
    totalAmount: pr.amount ?? 0,
    status: pr.status || "Pending",
    transactionId: pr.transactionId || "",
    rejectionReason: pr.rejectionReason || "",
    source: "payout_request",
    createdAt: pr.createdAt,
  };
}

export async function getEarningsSummary(partnerId) {
  const user = await User.findById(partnerId).select("partnerAvailableBalance");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  await syncPartnerAvailableBalance(partnerId);
  const updated = await User.findById(partnerId).select("partnerAvailableBalance");
  const [monthlyPayouts, requests] = await Promise.all([
    Payout.find({ partnerId }).sort({ month: -1 }).lean(),
    PayoutRequest.find({ partnerId }).sort({ createdAt: -1 }).lean(),
  ]);
  // Show ALL payout requests (Pending, Paid, Rejected) in payment history
  const requestRows = (requests || []).map(payoutRequestToHistoryRow);
  const payouts = [...monthlyPayouts, ...requestRows].sort((a, b) => {
    const ma = a.month || "";
    const mb = b.month || "";
    return mb.localeCompare(ma);
  });
  return {
    availableBalance: updated?.partnerAvailableBalance ?? 0,
    payouts,
    payoutRequests: requests,
  };
}

/**
 * Require partner to have complete bank details before creating a payout request (Requirement v).
 */
function requireBankDetails(user) {
  const bd = user.bankDetails || {};
  const hasAll =
    [bd.bankName, bd.branchName, bd.accountNo, bd.accountHolderName].every(
      (v) => typeof v === "string" && v.trim().length > 0
    );
  if (!hasAll) {
    const err = new Error(
      "Bank details are required before requesting a payout. Please update your Bank Settings."
    );
    err.statusCode = 400;
    throw err;
  }
}

export async function createPayoutRequest(partnerId, amount) {
  const user = await User.findById(partnerId).select(
    "partnerAvailableBalance shopName name bankDetails"
  );
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  requireBankDetails(user);
  if (user.partnerAvailableBalance < amount) {
    const err = new Error("Amount exceeds available balance");
    err.statusCode = 400;
    throw err;
  }
  return PayoutRequest.create({ partnerId: user._id, amount, status: "Pending" });
}

export async function getCheckouts(partnerId, page, limit) {
  const total = await Redemption.countDocuments({ partnerId });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip = (page - 1) * limit;
  const checkouts = await Redemption.find({ partnerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("cyclistId", "name")
    .lean();
  return {
    checkouts: checkouts.map((r) => ({
      transactionId: r.transactionId || r._id.toString(),
      cyclistName: r.cyclistId?.name ?? "—",
      itemName: r.itemName ?? "—",
      tokens: r.tokens,
      dateTime: r.createdAt,
    })),
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getScanStats(partnerId) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);
  const todayMatch = { partnerId, createdAt: { $gte: startOfToday, $lt: endOfToday } };
  const [scansToday, statsToday, totalRedemptions] = await Promise.all([
    Redemption.countDocuments(todayMatch),
    Redemption.aggregate([
      { $match: todayMatch },
      { $group: { _id: null, tokens: { $sum: "$tokens" } } },
    ]).then((r) => (r[0] ? r[0].tokens : 0)),
    Redemption.countDocuments({ partnerId }),
  ]);
  return { scansToday, tokensRedeemedToday: statsToday, successRate: totalRedemptions > 0 ? 100 : 100 };
}

export async function getRecentRedemptions(partnerId, limit) {
  const redemptions = await Redemption.find({ partnerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("cyclistId", "name")
    .lean();
  return {
    redemptions: redemptions.map((r) => ({
      _id: r._id.toString(),
      cyclistName: r.cyclistId?.name ?? "—",
      createdAt: r.createdAt,
      tokens: r.tokens,
    })),
  };
}
