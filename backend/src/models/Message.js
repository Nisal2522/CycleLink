/**
 * src/models/Message.js — Single message in a chat (Data Layer).
 */
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, default: "" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    editedAt: { type: Date, default: null },
    deleted: { type: Boolean, default: false },
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: () => [] },
  },
  { timestamps: true, collection: "messages" }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
