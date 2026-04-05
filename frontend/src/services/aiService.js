/**
 * services/aiService.js
 * --------------------------------------------------
 * AI chat: POST /api/ai/chat (non-streaming), POST /api/ai/chat/stream (SSE).
 */

import { axiosClient } from "./axiosClient.js";

const BASE = import.meta.env.VITE_API_URL ?? "";

export async function sendAiChat(message, history = []) {
  const url = BASE ? `${BASE}/ai/chat` : "/api/ai/chat";
  const { data } = await axiosClient.post(url, { message, history }, {
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

/**
 * Streaming chat: calls onChunk(text) as text arrives, onDone() when stream ends,
 * onError(err) on failure. Only invoke from user Send — no socket/typing.
 */
export async function sendAiChatStream(message, history = [], { onChunk, onDone, onError }) {
  const url = BASE ? `${BASE}/ai/chat/stream` : "/api/ai/chat/stream";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || `Request failed: ${res.status}`;
      onError(new Error(msg), res.status);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            onDone();
            return;
          }
          try {
            const obj = JSON.parse(payload);
            if (obj.error) {
              onError(new Error(obj.error), 429);
              return;
            }
            if (obj.text && typeof onChunk === "function") onChunk(obj.text);
          } catch (_) {}
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err, err.response?.status);
  }
}
