/**
 * controllers/paymentController.js
 * --------------------------------------------------
 * PayHere notify_url only. Stripe removed.
 */
import { verifyNotifyPayload } from "../utils/payhereHelper.js";

/**
 * PayHere notify_url: verify MD5, then mark payout request as Paid when status_code is success (2).
 */
export async function payhereNotify(req, res) {
  const result = verifyNotifyPayload(req.body || {});
  if (!result.valid) {
    console.error("[PayHere] Notify verification failed:", result.error);
    return res.status(401).json({ success: false, message: result.error || "Invalid signature" });
  }
  const body = req.body || {};
  const orderId = body.order_id;
  const statusCode = String(body.status_code ?? "").trim();
  console.log("[PayHere] Notify verified:", orderId, body.payhere_amount, "status_code:", statusCode);
  if (orderId && statusCode === "2") {
    try {
      const payoutService = await import("../services/payoutService.js");
      await payoutService.approvePayoutRequest(orderId);
      console.log("[PayHere] Payout request marked as Paid:", orderId);
    } catch (err) {
      console.error("[PayHere] Failed to mark payout as paid:", err.message);
    }
  }
  res.status(200).send("OK");
}

/**
 * Mark payout request as paid after PayHere onCompleted callback
 * Called from frontend when payment succeeds
 */
export async function markPayoutPaid(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    console.log("[PayHere] Frontend callback - marking as paid:", orderId);

    // Import payout service
    const payoutService = await import("../services/payoutService.js");
    await payoutService.approvePayoutRequest(orderId);

    console.log("[PayHere] ✅ Payout request marked as Paid via frontend callback:", orderId);

    return res.json({
      success: true,
      message: "Payout request marked as paid",
      orderId
    });

  } catch (err) {
    console.error("[PayHere] ❌ Failed to mark as paid:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update status"
    });
  }
}
