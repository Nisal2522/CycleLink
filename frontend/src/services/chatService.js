/**
 * services/chatService.js
 * --------------------------------------------------
 * Chat API and Socket.io client for real-time messaging.
 */

import { io } from "socket.io-client";

const BASE = import.meta.env.VITE_API_URL ?? "";
const CHAT_API = BASE ? `${BASE}/chat` : "/api/chat";

async function chatFetch(path, token, options = {}) {
  const res = await fetch(`${CHAT_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export async function getMyChats(token) {
  const data = await chatFetch("", token, { method: "GET" });
  return { chats: data.chats || [], totalUnread: data.totalUnread ?? 0 };
}

export async function searchUsers(token, q, limit = 20) {
  const params = new URLSearchParams({ q: String(q).trim(), limit });
  return chatFetch(`/users?${params}`, token, { method: "GET" });
}

export async function getMessages(token, chatId, limit = 50, before) {
  const params = new URLSearchParams({ limit });
  if (before) params.set("before", before);
  return chatFetch(`/${chatId}/messages?${params}`, token, { method: "GET" });
}

export async function createOneOnOneChat(token, userId) {
  return chatFetch("", token, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function createGroupChat(token, chatName, userIds) {
  return chatFetch("/group", token, {
    method: "POST",
    body: JSON.stringify({ chatName: chatName.trim(), userIds: Array.isArray(userIds) ? userIds : [] }),
  });
}

export async function editMessage(token, chatId, messageId, content) {
  return chatFetch(`/${chatId}/messages/${messageId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ content: content.trim() }),
  });
}

export async function deleteMessage(token, chatId, messageId, scope = "everyone") {
  return chatFetch(`/${chatId}/messages/${messageId}?scope=${scope}`, token, { method: "DELETE" });
}

/**
 * Create and connect socket with JWT. Returns socket instance.
 * In production (VITE_API_URL set), connect to backend origin; otherwise same-origin (Vite proxy).
 */
export function createChatSocket(token) {
  if (typeof window === "undefined" || !token) return null;
  const base = import.meta.env.VITE_API_URL ?? "";
  const socketOrigin = base ? base.replace(/\/api\/?$/, "") : window.location.origin;
  return io(socketOrigin, {
    path: "/socket.io",
    auth: { token },
  });
}
