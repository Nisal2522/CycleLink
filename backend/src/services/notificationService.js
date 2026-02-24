/**
 * src/services/notificationService.js — Third-party API integration (Requirement ii).
 * Sends reward-claimed notifications. Set NOTIFICATION_WEBHOOK_URL in .env to enable.
 */
export async function notifyRewardClaimed(payload) {
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl || !webhookUrl.trim()) return;

  const res = await fetch(webhookUrl.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "reward_claimed",
      ...payload,
      at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error("Notification webhook failed: " + res.status);
}
