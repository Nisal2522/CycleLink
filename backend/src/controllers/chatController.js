/**
 * controllers/chatController.js
 * --------------------------------------------------
 * Chat HTTP layer only. All data access via chatService (Controller → Service → Model).
 */

import asyncHandler from "express-async-handler";
import * as chatService from "../services/chatService.js";

export const createOrGetOneOnOneChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }
  const currentUserId = req.user._id;
  if (userId === currentUserId.toString()) {
    res.status(400);
    throw new Error("Cannot chat with yourself");
  }
  const { chat, created } = await chatService.createOrGetOneOnOneChat(currentUserId, userId);
  if (created) res.status(201).json(chat);
  else res.json(chat);
});

export const createGroupChat = asyncHandler(async (req, res) => {
  const { chatName, userIds } = req.body;
  if (!chatName || !chatName.trim()) {
    res.status(400);
    throw new Error("Group name is required");
  }
  const populated = await chatService.createGroupChat(req.user._id, chatName, userIds);
  res.status(201).json(populated);
});

export const getMyChats = asyncHandler(async (req, res) => {
  const result = await chatService.getMyChats(req.user._id);
  res.json(result);
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await chatService.getMessages(req.params.chatId, req.user._id, req.query);
  res.json(messages);
});

export const editMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400);
    throw new Error("Content is required");
  }
  const populated = await chatService.editMessage(chatId, messageId, req.user._id, content);
  const io = req.app.get("io");
  if (io) io.to(`chat:${chatId}`).emit("message-edited", populated);
  res.json(populated);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;
  const scope = req.query.scope;
  const result = await chatService.deleteMessage(chatId, messageId, req.user._id, scope);
  const io = req.app.get("io");
  if (io) io.to(`chat:${chatId}`).emit("message-deleted", result.payload);
  res.json({ messageId: result.messageId, scope: result.scope });
});

export const searchUsers = asyncHandler(async (req, res) => {
  const q = req.query.q;
  const users = await chatService.searchUsers(req.user._id, q);
  res.json(users);
});
