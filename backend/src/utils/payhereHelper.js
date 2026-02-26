/**
 * src/utils/payhereHelper.js — PayHere notify_url verification + payment init (Requirement iv).
 * Reads env at runtime so values are set after dotenv loads (fixes 503 when vars in .env).
 */
import crypto from "crypto";

function getEnv(name, fallback = "") {
  const v = process.env[name];
  return v != null ? String(v).trim() : (fallback != null ? String(fallback).trim() : "");
}

export function getMerchantId() {
  const id = getEnv("PAYHERE_MERCHANT_ID");
  if (!id) throw new Error("PAYHERE_MERCHANT_ID is not set in .env");
  return id;
}

export function getPayHereCheckoutUrl() {
  return getEnv("PAYHERE_BASE_URL") || "https://sandbox.payhere.lk/pay/checkout";
}

export function getNotifyUrl() {
  const base = getEnv("BACKEND_URL") || "http://localhost:5000";
  return `${base.replace(/\/$/, "")}/api/payments/payhere/notify`;
}

export function verifyNotifyPayload(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Missing or invalid body" };
  }
  const secret = getEnv("PAYHERE_SECRET");
  if (!secret) return { valid: false, error: "PayHere not configured" };
  const receivedSig = String(body.md5sig ?? "").trim().toLowerCase();
  if (!receivedSig) return { valid: false, error: "Missing md5sig" };
  const str =
    String(body.merchant_id ?? "").trim() +
    String(body.order_id ?? "").trim() +
    String(body.payhere_amount ?? "").trim() +
    String(body.payhere_currency ?? "").trim() +
    String(body.status_code ?? "").trim() +
    secret;
  const expectedSig = crypto.createHash("md5").update(str, "utf8").digest("hex").toLowerCase();
  return receivedSig === expectedSig ? { valid: true } : { valid: false, error: "MD5 signature mismatch" };
}

/**
 * Build PayHere checkout form params for admin payout.
 * PayHere (support.payhere.lk): hash = MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
 * Amount must be formatted with 2 decimals; hash must be uppercase.
 */
export function buildPayoutPaymentParams(opts) {
  const { orderId, amount, partnerName, partnerEmail = "", partnerPhone = "", partnerAddress = "", partnerCity = "" } = opts;
  const secret = getEnv("PAYHERE_SECRET");
  const merchantId = getEnv("PAYHERE_MERCHANT_ID");
  if (!secret || !merchantId) {
    const err = new Error("PayHere not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_SECRET in .env");
    err.statusCode = 503;
    throw err;
  }
  const merchant_id = merchantId;
  const order_id = String(orderId).trim();
  const amountNum = Number(amount) || 0;
  const amountStr = amountNum.toFixed(2);
  const currency = "LKR";
  const secretHash = crypto.createHash("md5").update(secret, "utf8").digest("hex").toUpperCase();
  const hashStr = merchant_id + order_id + amountStr + currency + secretHash;
  const hash = crypto.createHash("md5").update(hashStr, "utf8").digest("hex").toUpperCase();

  const frontendOrigin = getEnv("FRONTEND_ORIGIN") || "http://localhost:5173";
  const returnUrl = `${frontendOrigin}/admin?tab=payouts&payhere=success`;
  const cancelUrl = `${frontendOrigin}/admin?tab=payouts&payhere=cancel`;
  const notifyUrl = getNotifyUrl();
  const payhereUrl = getPayHereCheckoutUrl();
  const items = `Payout to ${String(partnerName).replace(/\|/g, " ")}|1|${amountStr}`;
  const sandbox = getEnv("PAYHERE_SANDBOX", "true") === "true" ? 1 : 0;

  return {
    payhereUrl,
    formData: {
      merchant_id,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id,
      items,
      amount: amountStr,
      currency,
      first_name: "Admin",
      last_name: "Cycle",
      email: partnerEmail || "admin@cycle.lk",
      phone: partnerPhone || "0771234567",
      address: partnerAddress || "Colombo, Sri Lanka",
      city: partnerCity || "Colombo",
      country: "Sri Lanka",
      sandbox,
      hash,
    },
  };
}
