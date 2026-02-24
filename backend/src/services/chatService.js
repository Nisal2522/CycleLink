/**
 * src/services/chatService.js
 * --------------------------------------------------
 * Chat business logic. All Chat, Message, User model access here (Controller → Service → Model).
 */

import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { LIMITS } from "../constants.js";

export async function createOrGetOneOnOneChat(currentUserId, otherUserId) {
  const other = await User.findById(otherUserId).select("name email profileImage role");
  if (!other) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  let chat = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [currentUserId, otherUserId], $size: 2 },
  })
    .populate("users", "name email profileImage role")
    .populate("latestMessage")
    .lean();
  if (chat) return { chat, created: false };
  chat = await Chat.create({
    chatName: "",
    isGroupChat: false,
    users: [currentUserId, otherUserId],
  });
  chat = await Chat.findById(chat._id).populate("users", "name email profileImage role").lean();
  return { chat, created: true };
}

export async function createGroupChat(creatorId, chatName, userIds) {
  const ids = Array.isArray(userIds) ? userIds : [];
  const allIds = [creatorId.toString(), ...ids.map((id) => id.toString())];
  const uniqueIds = [...new Set(allIds)];
  if (uniqueIds.length < 2) {
    const err = new Error("Add at least one other member");
    err.statusCode = 400;
    throw err;
  }
  const chat = await Chat.create({
    chatName: String(chatName).trim(),
    isGroupChat: true,
    users: uniqueIds,
    groupAdmin: creatorId,
  });
  const populated = await Chat.findById(chat._id)
    .populate("users", "name email profileImage role")
    .populate("groupAdmin", "name email profileImage role")
    .lean();
  return populated;
}

export async function getMyChats(userId) {
  const chats = await Chat.find({ users: userId })
    .populate("users", "name email profileImage role")
    .populate({ path: "latestMessage", populate: { path: "sender", select: "name _id" } })
    .populate("groupAdmin", "name email profileImage role")
    .sort({ updatedAt: -1 })
    .lean();
  const uid = userId.toString();
  let totalUnread = 0;
  const chatsWithUnread = chats.map((c) => {
    const raw = c.unreadCount;
    const unread = Math.max(0, parseInt(raw?.[uid] ?? raw?.get?.(uid), 10) || 0);
    totalUnread += unread;
    return { ...c, unreadCount: unread };
  });
  return { chats: chatsWithUnread, totalUnread };
}

export async function getMessages(chatId, userId, query) {
  const limit = Math.min(parseInt(query.limit, 10) || 50, LIMITS.MESSAGES_MAX);
  const before = query.before;
  const chat = await Chat.findOne({ _id: chatId, users: userId });
  if (!chat) {
    const err = new Error("Chat not found");
    err.statusCode = 404;
    throw err;
  }
  const uid = userId.toString();
  if (!chat.unreadCount) chat.unreadCount = new Map();
  chat.unreadCount.set(uid, 0);
  chat.markModified("unreadCount");
  await chat.save();
  let messageQuery = { chat: chatId, hiddenFor: { $ne: userId } };
  if (before) {
    const beforeMsg = await Message.findById(before);
    if (beforeMsg) messageQuery.createdAt = { $lt: beforeMsg.createdAt };
  }
  const messages = await Message.find(messageQuery)
    .populate("sender", "name email profileImage role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return messages.reverse();
}

export async function editMessage(chatId, messageId, userId, content) {
  const chat = await Chat.findOne({ _id: chatId, users: userId });
  if (!chat) {
    const err = new Error("Chat not found");
    err.statusCode = 404;
    throw err;
  }
  const msg = await Message.findOne({ _id: messageId, chat: chatId, sender: userId });
  if (!msg) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }
  if (msg.deleted) {
    const err = new Error("Cannot edit deleted message");
    err.statusCode = 400;
    throw err;
  }
  msg.content = content.trim();
  msg.editedAt = new Date();
  await msg.save();
  const populated = await Message.findById(msg._id)
    .populate("sender", "name email profileImage role")
    .lean();
  return populated;
}

export async function deleteMessage(chatId, messageId, userId, scope) {
  const chat = await Chat.findOne({ _id: chatId, users: userId });
  if (!chat) {
    const err = new Error("Chat not found");
    err.statusCode = 404;
    throw err;
  }
  const msg = await Message.findOne({ _id: messageId, chat: chatId });
  if (!msg) {
    const err = new Error("Message not found");
    err.statusCode = 404;
    throw err;
  }
  const sc = (scope || "everyone").toLowerCase();
  if (sc === "me") {
    if (!msg.hiddenFor) msg.hiddenFor = [];
    if (!msg.hiddenFor.some((id) => id.toString() === userId.toString())) {
      msg.hiddenFor.push(userId);
      await msg.save();
    }
    return { messageId, scope: "me", payload: { messageId, chatId, scope: "me", userId: userId.toString() } };
  }
  if (msg.sender.toString() !== userId.toString()) {
    const err = new Error("Only the sender can delete for everyone");
    err.statusCode = 403;
    throw err;
  }
  msg.deleted = true;
  msg.content = "";
  msg.editedAt = null;
  await msg.save();
  const message = await Message.findById(messageId).populate("sender", "name email profileImage role").lean();
  return {
    messageId,
    scope: "everyone",
    payload: { messageId, chatId, scope: "everyone", message },
  };
}

export async function searchUsers(currentUserId, q) {
  const query = (q || "").trim();
  if (!query) return [];
  const limit = Math.min(20, LIMITS.SEARCH_USERS_MAX);
  return User.find({
    _id: { $ne: currentUserId },
    isBlocked: { $ne: true },
    $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
  })
    .select("name email profileImage role")
    .limit(limit)
    .lean();
}
