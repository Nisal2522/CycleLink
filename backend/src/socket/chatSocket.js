/**
 * src/socket/chatSocket.js — Socket.io chat: auth via JWT, join chat room, send message, typing, online.
 */
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

const onlineUsers = new Map();

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return null;
  }
}

export function setupChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const userId = getUserIdFromToken(token);
    if (!userId) return next(new Error("Authentication required"));
    socket.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    onlineUsers.set(socket.id, { userId, socket });

    const broadcastOnline = () => {
      const ids = [...new Set([...onlineUsers.values()].map((u) => u.userId.toString()))];
      io.emit("online_users", ids);
    };
    broadcastOnline();

    socket.on("join_chat", (chatId) => {
      if (chatId) socket.join(`chat:${chatId}`);
    });

    socket.on("leave_chat", (chatId) => {
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    socket.on("send_message", async (payload) => {
      const { chatId, content } = payload || {};
      if (!chatId || typeof content !== "string") return;
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.users.some((u) => u.toString() === userId.toString())) return;
      const msg = await Message.create({ sender: userId, content: content.trim(), chat: chatId });
      const senderIdStr = userId.toString();
      if (!chat.unreadCount) chat.unreadCount = new Map();
      chat.users.forEach((uid) => {
        const uidStr = uid.toString();
        if (uidStr !== senderIdStr) chat.unreadCount.set(uidStr, (chat.unreadCount.get(uidStr) || 0) + 1);
      });
      chat.latestMessage = msg._id;
      chat.markModified("unreadCount");
      await chat.save();
      const populated = await Message.findById(msg._id).populate("sender", "name email profileImage role").lean();
      io.to(`chat:${chatId}`).emit("new_message", populated);
    });

    socket.on("typing", ({ chatId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_typing", { userId });
    });

    socket.on("stop_typing", ({ chatId }) => {
      if (chatId) socket.to(`chat:${chatId}`).emit("user_stop_typing", { userId });
    });

    socket.on("message-seen", async (payload) => {
      const { chatId } = payload || {};
      if (!chatId) return;
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.users.some((u) => u.toString() === userId.toString())) return;
      const userIdStr = userId.toString();
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId)) : null;
      if (!userIdObj) return;
      const messages = await Message.find({ chat: chatId, readBy: { $nin: [userIdObj] } }).lean();
      if (messages.length === 0) return;
      const ids = messages.map((m) => m._id);
      await Message.updateMany({ _id: { $in: ids } }, { $addToSet: { readBy: userIdObj } });
      io.to(`chat:${chatId}`).emit("messages-seen", { messageIds: ids.map((id) => id.toString()), readByUserId: userIdStr });
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);
      broadcastOnline();
    });
  });

  return { onlineUsers: () => onlineUsers };
}
