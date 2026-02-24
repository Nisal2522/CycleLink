/**
 * src/models/Chat.js — Chat room (Data Layer).
 */
import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatName: { type: String, trim: true, default: "" },
    isGroupChat: { type: Boolean, default: false },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unreadCount: { type: Map, of: Number, default: () => new Map() },
  },
  { timestamps: true, collection: "chats" }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
